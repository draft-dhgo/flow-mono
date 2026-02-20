import { describe, it, expect, vi } from 'vitest';
import {
  CancelWorkflowRunUseCase,
  WorkflowRunNotFoundError,
  WorkflowRunCannotCancelError,
} from '@workflow-runtime/application/commands/cancel-workflow-run-use-case.js';
import { WorkflowRun, WorkExecution } from '@workflow-runtime/domain/index.js';
import type { WorkflowRunRepository, WorkExecutionRepository, EventPublisher } from '@workflow-runtime/domain/index.js';
import type { AgentService } from '@common/ports/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import { WorkflowRunId, WorkExecutionId, WorkNodeConfig, TaskNodeConfig } from '@workflow-runtime/domain/value-objects/index.js';

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
    findByWorkflowId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  const workExecutionRepository: WorkExecutionRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn().mockResolvedValue([]),
    findByWorkflowRunIdOrderedBySequence: vi.fn(),
    save: vi.fn(),
    saveAll: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const agentService: AgentService = {
    startSession: vi.fn(),
    stopSession: vi.fn(),
    deleteSession: vi.fn(),
    sendQuery: vi.fn(),
    findSessionByWorkExecutionId: vi.fn(),
  };
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  return { workflowRunRepository, workExecutionRepository, agentService, eventPublisher };
}

function createUseCase(mocks: ReturnType<typeof createMocks>) {
  return new CancelWorkflowRunUseCase(
    mocks.workflowRunRepository as never,
    mocks.workExecutionRepository as never,
    mocks.agentService as never,
    mocks.eventPublisher as never,
  );
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

describe('CancelWorkflowRunUseCase', () => {
  it('cancels a running workflow run', async () => {
    const mocks = createMocks();
    const run = createRunningRun();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowRunId: run.id, reason: 'user cancelled' });

    expect(mocks.workflowRunRepository.save).toHaveBeenCalledOnce();
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalledOnce();
  });

  it('throws WorkflowRunNotFoundError when not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(null);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workflowRunId: 'nonexistent' as WorkflowRunId }),
    ).rejects.toThrow(WorkflowRunNotFoundError);
  });

  it('throws WorkflowRunCannotCancelError for terminal run', async () => {
    const mocks = createMocks();
    const run = WorkflowRun.create({
      workflowId: WF_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [makeWorkNodeConfig(0)],
    });
    run.addWorkExecution('we-0' as WorkExecutionId);
    run.start();
    run.advanceWork(); // COMPLETED
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workflowRunId: run.id }),
    ).rejects.toThrow(WorkflowRunCannotCancelError);
  });

  it('stops agent sessions for active work executions', async () => {
    const mocks = createMocks();
    const run = createRunningRun();
    const we = WorkExecution.create({
      workflowRunId: run.id,
      workflowId: WF_ID,
      sequence: 0,
      model: 'claude-sonnet',
      taskProps: [{ order: 0, query: 'test' }],
    });
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);
    vi.mocked(mocks.workExecutionRepository.findByWorkflowRunId).mockResolvedValue([we]);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowRunId: run.id });

    expect(mocks.agentService.stopSession).toHaveBeenCalledWith(we.id);
    expect(mocks.agentService.deleteSession).toHaveBeenCalledWith(we.id);
  });
});
