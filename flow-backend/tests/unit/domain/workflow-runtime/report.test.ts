import { describe, it, expect } from 'vitest';
import { Report } from '@workflow-runtime/domain/entities/report.js';
import { ReportStatus } from '@workflow-runtime/domain/value-objects/index.js';
import type { TaskExecutionId, WorkExecutionId, WorkflowRunId } from '@workflow-runtime/domain/value-objects/index.js';
import { ReportOutline, Section } from '@common/value-objects/index.js';

const TASK_ID = 'task-001' as TaskExecutionId;
const WE_ID = 'we-001' as WorkExecutionId;
const RUN_ID = 'run-001' as WorkflowRunId;

function createReport(): Report {
  const outline = ReportOutline.create([
    Section.create('Intro', 'Introduction section'),
  ]);
  return Report.create({
    taskExecutionId: TASK_ID,
    workExecutionId: WE_ID,
    workflowRunId: RUN_ID,
    outline,
  });
}

describe('Report', () => {
  it('creates in PENDING status', () => {
    const report = createReport();
    expect(report.status).toBe(ReportStatus.PENDING);
    expect(report.filePath).toBeNull();
    expect(report.errorMessage).toBeNull();
  });

  it('complete: PENDING → COMPLETED', () => {
    const report = createReport();
    report.complete('/path/to/report.md', 'report content');
    expect(report.status).toBe(ReportStatus.COMPLETED);
    expect(report.filePath).toBe('/path/to/report.md');
    expect(report.content).toBe('report content');
  });

  it('complete emits ReportCompleted event', () => {
    const report = createReport();
    report.clearDomainEvents();
    report.complete('/path/to/report.md', 'report content');
    const events = report.clearDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('report.completed');
  });

  it('complete throws with empty path', () => {
    const report = createReport();
    expect(() => report.complete('', 'content')).toThrow();
  });

  it('fail: PENDING → FAILED', () => {
    const report = createReport();
    report.fail('Generation error');
    expect(report.status).toBe(ReportStatus.FAILED);
    expect(report.errorMessage).toBe('Generation error');
  });

  it('fail emits ReportFailed event', () => {
    const report = createReport();
    report.clearDomainEvents();
    report.fail('error');
    const events = report.clearDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('report.failed');
  });

  it('complete throws if not PENDING', () => {
    const report = createReport();
    report.complete('/path', 'content');
    expect(() => report.complete('/path2', 'content2')).toThrow();
  });

  it('fail throws if not PENDING', () => {
    const report = createReport();
    report.fail('error');
    expect(() => report.fail('error2')).toThrow();
  });

  it('isTerminal returns true for COMPLETED', () => {
    const report = createReport();
    report.complete('/path', 'content');
    expect(report.isTerminal()).toBe(true);
  });

  it('isTerminal returns true for FAILED', () => {
    const report = createReport();
    report.fail('error');
    expect(report.isTerminal()).toBe(true);
  });

  it('reset restores to PENDING', () => {
    const report = createReport();
    report.complete('/path', 'content');
    report.reset();
    expect(report.status).toBe(ReportStatus.PENDING);
    expect(report.filePath).toBeNull();
    expect(report.content).toBeNull();
  });
});
