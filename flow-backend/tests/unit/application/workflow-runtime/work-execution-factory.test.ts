import { describe, it, expect } from 'vitest';
import { WorkExecutionFactory } from '@workflow-runtime/application/factories/work-execution-factory.js';
import {
  WorkNodeConfig,
  TaskNodeConfig,
  ReportStatus,
} from '@workflow-runtime/domain/value-objects/index.js';
import type { WorkflowRunId } from '@workflow-runtime/domain/value-objects/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import { Section, ReportOutline } from '@common/value-objects/index.js';

const RUN_ID = 'run-test-001' as WorkflowRunId;
const WF_ID = 'wf-test-001' as WorkflowId;

function makeOutline(): ReportOutline {
  return ReportOutline.create([Section.create('Summary', 'Summary section')]);
}

function makeWorkNodeConfig(opts?: {
  taskCount?: number;
  withReport?: boolean;
  sequence?: number;
  model?: string;
}): WorkNodeConfig {
  const taskCount = opts?.taskCount ?? 2;
  const taskConfigs = Array.from({ length: taskCount }, (_, i) =>
    TaskNodeConfig.create(
      i,
      `Task query ${i}`,
      opts?.withReport && i === 0 ? makeOutline() : null,
    ),
  );

  return WorkNodeConfig.create({
    sequence: opts?.sequence ?? 0,
    model: opts?.model ?? 'claude-sonnet',
    taskConfigs,
  });
}

describe('WorkExecutionFactory', () => {
  const factory = new WorkExecutionFactory();

  it('builds WorkExecution with correct initial state', () => {
    const config = makeWorkNodeConfig();
    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    expect(result.workExecution.workflowRunId).toBe(RUN_ID);
    expect(result.workExecution.workflowId).toBe(WF_ID);
    expect(result.workExecution.workNodeConfigId).toBe(config.id);
    expect(result.workExecution.sequence).toBe(config.sequence);
    expect(result.workExecution.model).toBe('claude-sonnet');
    expect(result.workExecution.currentTaskIndex).toBe(0);
    expect(result.workExecution.isCompleted).toBe(false);
    expect(result.workExecution.isCancelled).toBe(false);
  });

  it('creates correct number of task executions', () => {
    const config = makeWorkNodeConfig({ taskCount: 3 });
    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    expect(result.workExecution.taskExecutions).toHaveLength(3);
  });

  it('preserves task query order', () => {
    const config = makeWorkNodeConfig({ taskCount: 3 });
    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    expect(result.workExecution.taskExecutions[0].query).toBe('Task query 0');
    expect(result.workExecution.taskExecutions[1].query).toBe('Task query 1');
    expect(result.workExecution.taskExecutions[2].query).toBe('Task query 2');
  });

  it('returns empty reports array when no task has reportOutline', () => {
    const config = makeWorkNodeConfig({ withReport: false });
    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    expect(result.reports).toHaveLength(0);
  });

  it('creates a Report when a task has reportOutline', () => {
    const config = makeWorkNodeConfig({ withReport: true, taskCount: 2 });
    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    expect(result.reports).toHaveLength(1);

    const report = result.reports[0];
    expect(report.workflowRunId).toBe(RUN_ID);
    expect(report.workExecutionId).toBe(result.workExecution.id);
    expect(report.status).toBe(ReportStatus.PENDING);
    expect(report.outline.sections).toHaveLength(1);
    expect(report.outline.sections[0].title).toBe('Summary');
  });

  it('links Report to the correct TaskExecution', () => {
    const config = makeWorkNodeConfig({ withReport: true, taskCount: 2 });
    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    const report = result.reports[0];
    const firstTask = result.workExecution.taskExecutions[0];

    expect(report.taskExecutionId).toBe(firstTask.id);
  });

  it('assigns matching reportId to TaskExecution and Report', () => {
    const config = makeWorkNodeConfig({ withReport: true, taskCount: 2 });
    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    const firstTask = result.workExecution.taskExecutions[0];
    const report = result.reports[0];

    expect(firstTask.reportId).toBe(report.id);
  });

  it('does not assign reportId to tasks without reportOutline', () => {
    const config = makeWorkNodeConfig({ withReport: true, taskCount: 2 });
    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    const secondTask = result.workExecution.taskExecutions[1];
    expect(secondTask.reportId).toBeNull();
  });

  it('creates multiple reports when multiple tasks have reportOutlines', () => {
    const taskConfigs = [
      TaskNodeConfig.create(0, 'Task 0', makeOutline()),
      TaskNodeConfig.create(1, 'Task 1', makeOutline()),
      TaskNodeConfig.create(2, 'Task 2', null),
    ];

    const config = WorkNodeConfig.create({
      sequence: 0,
      model: 'claude-sonnet',
      taskConfigs,
    });

    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    expect(result.reports).toHaveLength(2);
    expect(result.workExecution.taskExecutions[0].reportId).not.toBeNull();
    expect(result.workExecution.taskExecutions[1].reportId).not.toBeNull();
    expect(result.workExecution.taskExecutions[2].reportId).toBeNull();
  });

  it('preserves sequence from WorkNodeConfig', () => {
    const config = makeWorkNodeConfig({ sequence: 5 });
    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    expect(result.workExecution.sequence).toBe(5);
  });

  it('preserves model from WorkNodeConfig', () => {
    const config = makeWorkNodeConfig({ model: 'claude-opus' });
    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    expect(result.workExecution.model).toBe('claude-opus');
  });

  it('raises WorkExecutionStarted domain event on creation', () => {
    const config = makeWorkNodeConfig();
    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    const events = result.workExecution.clearDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('work-execution.started');
  });

  it('reports are created with PENDING status and null filePath/content', () => {
    const config = makeWorkNodeConfig({ withReport: true });
    const result = factory.buildFromConfig(RUN_ID, WF_ID, config);

    for (const report of result.reports) {
      expect(report.status).toBe(ReportStatus.PENDING);
      expect(report.filePath).toBeNull();
      expect(report.content).toBeNull();
    }
  });
});
