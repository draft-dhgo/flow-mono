import { describe, it, expect, vi } from 'vitest';
import { ReportGeneratedHandler } from '@workflow-runtime/application/event-handlers/report-generated-handler.js';
import { Report } from '@workflow-runtime/domain/index.js';
import type { ReportRepository } from '@workflow-runtime/domain/index.js';
import { TaskExecutionId, WorkExecutionId, WorkflowRunId } from '@workflow-runtime/domain/value-objects/index.js';
import { ReportCompleted } from '@common/events/index.js';
import { ReportOutline, Section } from '@common/value-objects/index.js';

const REPORT_ID = 'rpt-001';
const TE_ID = 'te-001';
const WE_ID = 'we-001';
const WR_ID = 'wr-001';

function createMocks() {
  const reportRepository: ReportRepository = {
    findById: vi.fn(),
    findByWorkExecutionId: vi.fn(),
    findByWorkflowRunId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  return { reportRepository };
}

function createReport(): Report {
  return Report.create({
    taskExecutionId: TaskExecutionId.generate(),
    workExecutionId: WorkExecutionId.generate(),
    workflowRunId: WorkflowRunId.generate(),
    outline: ReportOutline.create([Section.create('Summary', 'A brief summary')]),
  });
}

describe('ReportGeneratedHandler', () => {
  it('looks up the report when report is completed', async () => {
    const mocks = createMocks();
    const report = createReport();
    vi.mocked(mocks.reportRepository.findById).mockResolvedValue(report);

    const handler = new ReportGeneratedHandler(mocks.reportRepository as never);
    const event = new ReportCompleted({
      reportId: report.id,
      taskExecutionId: TE_ID,
      workExecutionId: WE_ID,
      workflowRunId: WR_ID,
      filePath: '/tmp/reports/report.md',
    });

    await handler.handle(event);

    expect(mocks.reportRepository.findById).toHaveBeenCalledWith(report.id);
  });

  it('handles missing report gracefully', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.reportRepository.findById).mockResolvedValue(null);

    const handler = new ReportGeneratedHandler(mocks.reportRepository as never);
    const event = new ReportCompleted({
      reportId: REPORT_ID,
      taskExecutionId: TE_ID,
      workExecutionId: WE_ID,
      workflowRunId: WR_ID,
      filePath: '/tmp/reports/report.md',
    });

    await expect(handler.handle(event)).resolves.toBeUndefined();
  });

  it('does not modify the report state', async () => {
    const mocks = createMocks();
    const report = createReport();
    vi.mocked(mocks.reportRepository.findById).mockResolvedValue(report);

    const handler = new ReportGeneratedHandler(mocks.reportRepository as never);
    const event = new ReportCompleted({
      reportId: report.id,
      taskExecutionId: TE_ID,
      workExecutionId: WE_ID,
      workflowRunId: WR_ID,
      filePath: '/tmp/reports/report.md',
    });

    await handler.handle(event);

    // Handler should not save — it is read-only for cross-cutting concerns
    expect(mocks.reportRepository.save).not.toHaveBeenCalled();
  });
});
