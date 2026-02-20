import { describe, it, expect, vi } from 'vitest';
import { GetReportQuery } from '@workflow-runtime/application/queries/get-report-query.js';
import { Report } from '@workflow-runtime/domain/entities/report.js';
import {
  ReportId, TaskExecutionId, WorkExecutionId, WorkflowRunId, ReportStatus,
} from '@workflow-runtime/domain/value-objects/index.js';
import { ReportOutline } from '@common/value-objects/index.js';
import type { ReportRepository } from '@workflow-runtime/domain/ports/report-repository.js';
import type { FileSystem } from '@workflow-runtime/domain/ports/file-system.js';
import { ApplicationError } from '@common/errors/index.js';

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
  const fileSystem: FileSystem = {
    createDirectory: vi.fn(),
    deleteDirectory: vi.fn(),
    directoryExists: vi.fn(),
    createFile: vi.fn(),
    readFile: vi.fn(),
    deleteFile: vi.fn(),
    fileExists: vi.fn(),
    createSymlink: vi.fn(),
    deleteSymlink: vi.fn(),
    stat: vi.fn(),
    list: vi.fn(),
    copy: vi.fn(),
    move: vi.fn(),
  };
  return { reportRepository, fileSystem };
}

const WE_ID = WorkExecutionId.generate();
const WR_ID = WorkflowRunId.generate();

function makeOutline(): ReportOutline {
  return ReportOutline.create([{ title: 'Section 1', description: 'Desc 1' }]);
}

function makeCompletedReport(content: string, filePath: string | null = null): Report {
  return Report.fromProps({
    id: ReportId.generate(),
    taskExecutionId: TaskExecutionId.generate(),
    workExecutionId: WE_ID,
    workflowRunId: WR_ID,
    outline: makeOutline(),
    filePath,
    content,
    status: ReportStatus.COMPLETED,
  });
}

function makePendingReport(): Report {
  return Report.fromProps({
    id: ReportId.generate(),
    taskExecutionId: TaskExecutionId.generate(),
    workExecutionId: WE_ID,
    workflowRunId: WR_ID,
    outline: makeOutline(),
    filePath: null,
    content: null,
    status: ReportStatus.PENDING,
  });
}

describe('GetReportQuery', () => {
  it('returns report content from inline content', async () => {
    const mocks = createMocks();
    const report = makeCompletedReport('Report content here');
    vi.mocked(mocks.reportRepository.findByWorkExecutionId).mockResolvedValue([report]);

    const query = new GetReportQuery(mocks.reportRepository, mocks.fileSystem);
    const result = await query.execute({ workExecutionId: WE_ID });

    expect(result.content).toBe('Report content here');
    expect(mocks.reportRepository.findByWorkExecutionId).toHaveBeenCalledWith(WE_ID);
  });

  it('returns report content from file when no inline content', async () => {
    const mocks = createMocks();
    const report = makeCompletedReport(null as unknown as string, '/tmp/report.md');
    vi.mocked(mocks.reportRepository.findByWorkExecutionId).mockResolvedValue([report]);
    vi.mocked(mocks.fileSystem.readFile).mockResolvedValue('File content');

    const query = new GetReportQuery(mocks.reportRepository, mocks.fileSystem);
    const result = await query.execute({ workExecutionId: WE_ID });

    expect(result.content).toBe('File content');
    expect(mocks.fileSystem.readFile).toHaveBeenCalledWith('/tmp/report.md');
  });

  it('returns fallback message when file read fails', async () => {
    const mocks = createMocks();
    const report = makeCompletedReport(null as unknown as string, '/tmp/missing.md');
    vi.mocked(mocks.reportRepository.findByWorkExecutionId).mockResolvedValue([report]);
    vi.mocked(mocks.fileSystem.readFile).mockRejectedValue(new Error('ENOENT'));

    const query = new GetReportQuery(mocks.reportRepository, mocks.fileSystem);
    const result = await query.execute({ workExecutionId: WE_ID });

    expect(result.content).toContain('/tmp/missing.md');
  });

  it('returns empty content when only pending reports exist', async () => {
    const mocks = createMocks();
    const report = makePendingReport();
    vi.mocked(mocks.reportRepository.findByWorkExecutionId).mockResolvedValue([report]);

    const query = new GetReportQuery(mocks.reportRepository, mocks.fileSystem);
    const result = await query.execute({ workExecutionId: WE_ID });

    expect(result.content).toBe('');
  });

  it('throws ApplicationError when no reports found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.reportRepository.findByWorkExecutionId).mockResolvedValue([]);

    const query = new GetReportQuery(mocks.reportRepository, mocks.fileSystem);

    await expect(query.execute({ workExecutionId: WE_ID })).rejects.toThrow(ApplicationError);
  });

  it('joins multiple completed reports with separator', async () => {
    const mocks = createMocks();
    const reports = [
      makeCompletedReport('First report'),
      makeCompletedReport('Second report'),
    ];
    vi.mocked(mocks.reportRepository.findByWorkExecutionId).mockResolvedValue(reports);

    const query = new GetReportQuery(mocks.reportRepository, mocks.fileSystem);
    const result = await query.execute({ workExecutionId: WE_ID });

    expect(result.content).toBe('First report\n\n---\n\nSecond report');
  });
});
