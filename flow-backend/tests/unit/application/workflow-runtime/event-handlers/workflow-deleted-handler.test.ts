import { describe, it, expect, vi } from 'vitest';
import { WorkflowDeletedHandler } from '@workflow-runtime/application/event-handlers/workflow-deleted-handler.js';
import { WorkflowRun } from '@workflow-runtime/domain/index.js';
import type { WorkflowRunRepository } from '@workflow-runtime/domain/index.js';
import { WorkNodeConfig, TaskNodeConfig, WorkExecutionId } from '@workflow-runtime/domain/value-objects/index.js';
import type { CancelWorkflowRunUseCase } from '@workflow-runtime/application/commands/cancel-workflow-run-use-case.js';
import { WorkflowDeleted } from '@common/events/index.js';
import type { WorkflowId } from '@common/ids/index.js';

const WF_ID = 'wf-001' as WorkflowId;

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
    findByWorkflowId: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  const cancelWorkflowRunUseCase: CancelWorkflowRunUseCase = {
    execute: vi.fn(),
  } as unknown as CancelWorkflowRunUseCase;
  return { workflowRunRepository, cancelWorkflowRunUseCase };
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

function createCompletedRun(): WorkflowRun {
  const run = WorkflowRun.create({
    workflowId: WF_ID,
    issueKey: 'TEST-002',
    gitRefPool: [],
    mcpServerRefPool: [],
    workNodeConfigs: [makeWorkNodeConfig(0)],
  });
  run.addWorkExecution('we-0' as WorkExecutionId);
  run.start();
  run.advanceWork(); // COMPLETED
  run.clearDomainEvents();
  return run;
}

describe('WorkflowDeletedHandler', () => {
  it('cancels all active workflow runs when workflow is deleted', async () => {
    const mocks = createMocks();
    const run = createRunningRun();
    vi.mocked(mocks.workflowRunRepository.findByWorkflowId).mockResolvedValue([run]);

    const handler = new WorkflowDeletedHandler(
      mocks.workflowRunRepository as never,
      mocks.cancelWorkflowRunUseCase as never,
    );
    const event = new WorkflowDeleted({ workflowId: WF_ID });

    await handler.handle(event);

    expect(mocks.workflowRunRepository.findByWorkflowId).toHaveBeenCalledWith(WF_ID);
    expect(mocks.cancelWorkflowRunUseCase.execute).toHaveBeenCalledWith({
      workflowRunId: run.id,
      reason: `Parent workflow ${WF_ID} deleted`,
    });
  });

  it('skips terminal runs', async () => {
    const mocks = createMocks();
    const completedRun = createCompletedRun();
    vi.mocked(mocks.workflowRunRepository.findByWorkflowId).mockResolvedValue([completedRun]);

    const handler = new WorkflowDeletedHandler(
      mocks.workflowRunRepository as never,
      mocks.cancelWorkflowRunUseCase as never,
    );
    const event = new WorkflowDeleted({ workflowId: WF_ID });

    await handler.handle(event);

    expect(mocks.cancelWorkflowRunUseCase.execute).not.toHaveBeenCalled();
  });

  it('does nothing when no runs exist for the workflow', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRunRepository.findByWorkflowId).mockResolvedValue([]);

    const handler = new WorkflowDeletedHandler(
      mocks.workflowRunRepository as never,
      mocks.cancelWorkflowRunUseCase as never,
    );
    const event = new WorkflowDeleted({ workflowId: WF_ID });

    await handler.handle(event);

    expect(mocks.cancelWorkflowRunUseCase.execute).not.toHaveBeenCalled();
  });

  it('continues cancelling other runs if one cancellation fails', async () => {
    const mocks = createMocks();
    const run1 = createRunningRun();
    const run2 = createRunningRun();
    vi.mocked(mocks.workflowRunRepository.findByWorkflowId).mockResolvedValue([run1, run2]);
    vi.mocked(mocks.cancelWorkflowRunUseCase.execute)
      .mockRejectedValueOnce(new Error('cancel failed'))
      .mockResolvedValueOnce(undefined);

    const handler = new WorkflowDeletedHandler(
      mocks.workflowRunRepository as never,
      mocks.cancelWorkflowRunUseCase as never,
    );
    const event = new WorkflowDeleted({ workflowId: WF_ID });

    await handler.handle(event);

    expect(mocks.cancelWorkflowRunUseCase.execute).toHaveBeenCalledTimes(2);
  });
});
