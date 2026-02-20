import { describe, it, expect, vi } from 'vitest';
import { WorkExecutionStartedHandler } from '@workflow-runtime/application/event-handlers/work-execution-started-handler.js';
import { WorkflowRun } from '@workflow-runtime/domain/index.js';
import type { WorkflowRunRepository } from '@workflow-runtime/domain/index.js';
import { WorkNodeConfig, TaskNodeConfig, WorkExecutionId } from '@workflow-runtime/domain/value-objects/index.js';
import { WorkExecutionStarted } from '@common/events/index.js';
import type { WorkflowId } from '@common/ids/index.js';

const WF_ID = 'wf-001' as WorkflowId;
const WE_ID = 'we-001';
const WR_ID = 'wr-001';

function makeWorkNodeConfig(sequence: number): WorkNodeConfig {
  return WorkNodeConfig.create({
    sequence,
    model: 'claude-sonnet',
    taskConfigs: [TaskNodeConfig.create(0, 'test query')],
  });
}

function createMocks() {
  const workflowRunRepository: WorkflowRunRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByWorkflowId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  return { workflowRunRepository };
}

function createRunningRun(): WorkflowRun {
  const run = WorkflowRun.create({
    workflowId: WF_ID,
    issueKey: 'TEST-001',
    gitRefPool: [],
    mcpServerRefPool: [],
    workNodeConfigs: [makeWorkNodeConfig(0)],
  });
  run.addWorkExecution('we-0' as WorkExecutionId);
  run.start();
  run.clearDomainEvents();
  return run;
}

describe('WorkExecutionStartedHandler', () => {
  it('looks up the workflow run when work execution starts', async () => {
    const mocks = createMocks();
    const run = createRunningRun();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const handler = new WorkExecutionStartedHandler(mocks.workflowRunRepository as never);
    const event = new WorkExecutionStarted({
      workExecutionId: WE_ID,
      workflowRunId: run.id,
      workflowId: WF_ID,
      sequence: 0,
    });

    await handler.handle(event);

    expect(mocks.workflowRunRepository.findById).toHaveBeenCalledWith(run.id);
  });

  it('handles missing workflow run gracefully', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(null);

    const handler = new WorkExecutionStartedHandler(mocks.workflowRunRepository as never);
    const event = new WorkExecutionStarted({
      workExecutionId: WE_ID,
      workflowRunId: WR_ID,
      workflowId: WF_ID,
      sequence: 0,
    });

    await expect(handler.handle(event)).resolves.toBeUndefined();
  });

  it('does not throw on any event payload', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(null);

    const handler = new WorkExecutionStartedHandler(mocks.workflowRunRepository as never);
    const event = new WorkExecutionStarted({
      workExecutionId: 'we-999',
      workflowRunId: 'wr-999',
      workflowId: 'wf-999' as WorkflowId,
      sequence: 5,
    });

    await expect(handler.handle(event)).resolves.toBeUndefined();
  });
});
