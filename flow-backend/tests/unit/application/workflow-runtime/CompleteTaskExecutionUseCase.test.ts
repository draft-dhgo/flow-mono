import { describe, it, expect, vi } from 'vitest';
import {
  CompleteTaskExecutionUseCase,
  WorkExecutionNotFoundError,
  TaskNotCompletedError,
} from '@workflow-runtime/application/commands/complete-task-execution-use-case.js';
import { WorkExecution, WorkflowRun } from '@workflow-runtime/domain/index.js';
import type {
  WorkflowRunRepository, WorkExecutionRepository,
  CheckpointRepository, WorkTreeRepository, EventPublisher,
} from '@workflow-runtime/domain/index.js';
import type { GitService } from '@common/ports/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import { WorkflowRunId, WorkExecutionId, WorkNodeConfig, TaskNodeConfig, WorkflowRunStatus } from '@workflow-runtime/domain/value-objects/index.js';

const WF_ID = 'wf-001' as WorkflowId;
const WR_ID = WorkflowRunId.generate();

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
    findByWorkflowRunId: vi.fn(),
    findByWorkflowRunIdOrderedBySequence: vi.fn(),
    save: vi.fn(),
    saveAll: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const checkpointRepository: CheckpointRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const workTreeRepository: WorkTreeRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const gitService: GitService = {
    clone: vi.fn(),
    deleteRepo: vi.fn(),
    getCurrentCommit: vi.fn(),
    reset: vi.fn(),
  };
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  const unitOfWork = { run: async <T>(work: () => Promise<T>) => work() };
  return { workflowRunRepository, workExecutionRepository, checkpointRepository, workTreeRepository, gitService, eventPublisher, unitOfWork };
}

function createUseCase(mocks: ReturnType<typeof createMocks>) {
  return new CompleteTaskExecutionUseCase(
    mocks.workflowRunRepository as never,
    mocks.workExecutionRepository as never,
    mocks.checkpointRepository as never,
    mocks.workTreeRepository as never,
    mocks.gitService as never,
    mocks.eventPublisher as never,
    mocks.unitOfWork as never,
  );
}

describe('CompleteTaskExecutionUseCase', () => {
  it('throws WorkExecutionNotFoundError when not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(null);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workExecutionId: 'nonexistent' as WorkExecutionId }),
    ).rejects.toThrow(WorkExecutionNotFoundError);
  });

  it('throws TaskNotCompletedError when task is not completed', async () => {
    const mocks = createMocks();
    const we = WorkExecution.create({
      workflowRunId: WR_ID,
      workflowId: WF_ID,
      sequence: 0,
      model: 'claude-sonnet',
      taskProps: [{ order: 0, query: 'test' }],
    });
    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(we);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workExecutionId: we.id }),
    ).rejects.toThrow(TaskNotCompletedError);
  });

  it('completes task and advances when task is done', async () => {
    const mocks = createMocks();
    const we = WorkExecution.create({
      workflowRunId: WR_ID,
      workflowId: WF_ID,
      sequence: 0,
      model: 'claude-sonnet',
      taskProps: [{ order: 0, query: 'test' }],
    });
    we.currentTask()!.markCompleted();
    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(we);

    const run = WorkflowRun.create({
      workflowId: WF_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [makeWorkNodeConfig(0)],
    });
    run.addWorkExecution(we.id);
    run.start();
    run.clearDomainEvents();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const useCase = createUseCase(mocks);
    const result = await useCase.execute({ workExecutionId: we.id });

    expect(result.hasNextTask).toBe(false);
    expect(result.isWorkComplete).toBe(true);
    expect(mocks.workExecutionRepository.save).toHaveBeenCalledOnce();
  });

  it('transitions to AWAITING when previous work has pauseAfter', async () => {
    const mocks = createMocks();
    const pauseConfig = WorkNodeConfig.create({
      sequence: 0,
      model: 'claude-sonnet',
      taskConfigs: [TaskNodeConfig.create(0, 'test query')],
      pauseAfter: true,
    });
    const run = WorkflowRun.create({
      workflowId: WF_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [pauseConfig, makeWorkNodeConfig(1)],
    });
    const we = WorkExecution.create({
      workflowRunId: run.id,
      workflowId: WF_ID,
      sequence: 0,
      model: 'claude-sonnet',
      taskProps: [{ order: 0, query: 'test' }],
    });
    we.currentTask()!.markCompleted();
    run.addWorkExecution(we.id);
    run.start();
    run.clearDomainEvents();

    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(we);
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workExecutionId: we.id });

    expect(run.status).toBe(WorkflowRunStatus.AWAITING);
  });
});
