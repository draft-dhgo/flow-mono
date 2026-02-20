import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowPipelineServiceImpl } from '@workflow-runtime/infra/workflow-pipeline-service-impl.js';
import { WorkflowRun, WorkExecution } from '@workflow-runtime/domain/index.js';
import type { WorkflowRunRepository, WorkExecutionRepository, EventPublisher } from '@workflow-runtime/domain/index.js';
import { WorkExecutionId, WorkNodeConfig, TaskNodeConfig } from '@workflow-runtime/domain/value-objects/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import { ApplicationError } from '@common/errors/application-error.js';

const WF_ID = 'wf-001' as WorkflowId;
const WE_ID_1 = WorkExecutionId.generate();
const WE_ID_2 = WorkExecutionId.generate();

function makeWorkNodeConfig(sequence: number): WorkNodeConfig {
  return WorkNodeConfig.create({
    sequence,
    model: 'claude-sonnet',
    taskConfigs: [
      TaskNodeConfig.create(0, 'task-query-1'),
      TaskNodeConfig.create(1, 'task-query-2'),
    ],
  });
}

function createRunningRun(): WorkflowRun {
  const run = WorkflowRun.create({
    workflowId: WF_ID,
    issueKey: 'TEST-1',
    gitRefPool: [],
    mcpServerRefPool: [],
    workNodeConfigs: [makeWorkNodeConfig(0), makeWorkNodeConfig(1)],
  });
  run.start();
  run.clearDomainEvents();
  return run;
}

function createPausedRun(): WorkflowRun {
  const run = createRunningRun();
  run.pause();
  run.clearDomainEvents();
  return run;
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
  const startNextWorkExecutionUseCase = {
    execute: vi.fn(),
  };
  const sendQueryUseCase = {
    execute: vi.fn(),
  };
  const completeTaskExecutionUseCase = {
    execute: vi.fn(),
  };
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  return {
    workflowRunRepository,
    workExecutionRepository,
    startNextWorkExecutionUseCase,
    sendQueryUseCase,
    completeTaskExecutionUseCase,
    eventPublisher,
  };
}

function createService(mocks: ReturnType<typeof createMocks>) {
  return new WorkflowPipelineServiceImpl(
    mocks.startNextWorkExecutionUseCase as never,
    mocks.sendQueryUseCase as never,
    mocks.completeTaskExecutionUseCase as never,
    mocks.workflowRunRepository as never,
    mocks.workExecutionRepository as never,
    mocks.eventPublisher as never,
  );
}

describe('WorkflowPipelineServiceImpl', () => {
  let mocks: ReturnType<typeof createMocks>;
  let service: WorkflowPipelineServiceImpl;

  beforeEach(() => {
    mocks = createMocks();
    service = createService(mocks);
  });

  describe('runPipeline - normal pipeline with 2 works, each 2 tasks', () => {
    it('should execute all works and tasks in sequence', async () => {
      const run = createRunningRun();

      // First iteration: run is RUNNING
      vi.mocked(mocks.workflowRunRepository.findById)
        .mockResolvedValueOnce(run)   // initial check
        .mockResolvedValueOnce(run)   // after first work execution
        .mockResolvedValueOnce(run)   // second iteration check
        .mockResolvedValueOnce(run);  // after second work execution - will return isComplete

      // First work: returns workExecutionId, second: isComplete
      vi.mocked(mocks.startNextWorkExecutionUseCase.execute)
        .mockResolvedValueOnce({ workExecutionId: WE_ID_1, isComplete: false })
        .mockResolvedValueOnce({ workExecutionId: WE_ID_2, isComplete: false });

      // sendQuery always succeeds
      vi.mocked(mocks.sendQueryUseCase.execute).mockResolvedValue({ response: 'ok' });

      // completeTask: first call hasNext, second call workComplete for first WE
      // then first call hasNext, second call workComplete for second WE
      vi.mocked(mocks.completeTaskExecutionUseCase.execute)
        .mockResolvedValueOnce({ taskExecutionId: 't1', hasNextTask: true, isWorkComplete: false })
        .mockResolvedValueOnce({ taskExecutionId: 't2', hasNextTask: false, isWorkComplete: true })
        .mockResolvedValueOnce({ taskExecutionId: 't3', hasNextTask: true, isWorkComplete: false })
        .mockResolvedValueOnce({ taskExecutionId: 't4', hasNextTask: false, isWorkComplete: true });

      await service.runPipeline(run.id);

      expect(mocks.startNextWorkExecutionUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mocks.sendQueryUseCase.execute).toHaveBeenCalledTimes(4);
      expect(mocks.completeTaskExecutionUseCase.execute).toHaveBeenCalledTimes(4);
    });
  });

  describe('runPipeline - query failure with retry success', () => {
    it('should retry and succeed on second attempt', { timeout: 15000 }, async () => {
      const run = createRunningRun();

      vi.mocked(mocks.workflowRunRepository.findById)
        .mockResolvedValueOnce(run)
        .mockResolvedValueOnce(run);

      vi.mocked(mocks.startNextWorkExecutionUseCase.execute)
        .mockResolvedValueOnce({ workExecutionId: WE_ID_1, isComplete: false });

      // First call fails, second succeeds
      vi.mocked(mocks.sendQueryUseCase.execute)
        .mockRejectedValueOnce(new Error('transient error'))
        .mockResolvedValueOnce({ response: 'ok' });

      vi.mocked(mocks.completeTaskExecutionUseCase.execute)
        .mockResolvedValueOnce({ taskExecutionId: 't1', hasNextTask: false, isWorkComplete: true });

      await service.runPipeline(run.id);

      expect(mocks.sendQueryUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mocks.completeTaskExecutionUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('runPipeline - query failure with all retries exhausted', () => {
    it('should handle query failure with recovery logic', { timeout: 15000 }, async () => {
      const run = createRunningRun();
      const we = WorkExecution.create({
        workflowRunId: run.id,
        workflowId: WF_ID,
        workNodeConfigId: 'wnc-1' as never,
        sequence: 0,
        model: 'claude-sonnet',
        taskProps: [{ sequence: 0, query: 'q1' }],
      });
      we.clearDomainEvents();

      vi.mocked(mocks.workflowRunRepository.findById)
        .mockResolvedValueOnce(run)    // initial check
        .mockResolvedValueOnce(run);   // handleQueryFailure lookup

      vi.mocked(mocks.startNextWorkExecutionUseCase.execute)
        .mockResolvedValueOnce({ workExecutionId: we.id, isComplete: false });

      // All 3 attempts fail
      vi.mocked(mocks.sendQueryUseCase.execute)
        .mockRejectedValueOnce(new Error('fail-1'))
        .mockRejectedValueOnce(new Error('fail-2'))
        .mockRejectedValueOnce(new Error('fail-3'));

      vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValueOnce(we);

      await service.runPipeline(run.id);

      expect(mocks.sendQueryUseCase.execute).toHaveBeenCalledTimes(3);
      // handleQueryFailure should save work execution and run
      expect(mocks.workExecutionRepository.save).toHaveBeenCalled();
      expect(mocks.workflowRunRepository.save).toHaveBeenCalled();
      expect(mocks.eventPublisher.publishAll).toHaveBeenCalled();
    });
  });

  describe('runPipeline - run not in RUNNING state', () => {
    it('should exit immediately when run is PAUSED', async () => {
      const run = createPausedRun();

      vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValueOnce(run);

      await service.runPipeline(run.id);

      expect(mocks.startNextWorkExecutionUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('runPipeline - startNextWorkExecution returns isComplete', () => {
    it('should exit immediately when all work is complete', async () => {
      const run = createRunningRun();

      vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValueOnce(run);

      vi.mocked(mocks.startNextWorkExecutionUseCase.execute)
        .mockResolvedValueOnce({ workExecutionId: null, isComplete: true });

      await service.runPipeline(run.id);

      expect(mocks.startNextWorkExecutionUseCase.execute).toHaveBeenCalledTimes(1);
      expect(mocks.sendQueryUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('runPipeline - non-retryable error', () => {
    it('should not retry NOT_FOUND errors', { timeout: 15000 }, async () => {
      const run = createRunningRun();
      const we = WorkExecution.create({
        workflowRunId: run.id,
        workflowId: WF_ID,
        workNodeConfigId: 'wnc-1' as never,
        sequence: 0,
        model: 'claude-sonnet',
        taskProps: [{ sequence: 0, query: 'q1' }],
      });
      we.clearDomainEvents();

      vi.mocked(mocks.workflowRunRepository.findById)
        .mockResolvedValueOnce(run)
        .mockResolvedValueOnce(run);

      vi.mocked(mocks.startNextWorkExecutionUseCase.execute)
        .mockResolvedValueOnce({ workExecutionId: we.id, isComplete: false });

      vi.mocked(mocks.sendQueryUseCase.execute)
        .mockRejectedValueOnce(new ApplicationError('AGENT_SESSION_NOT_FOUND', 'not found'));

      vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValueOnce(we);

      await service.runPipeline(run.id);

      // Only 1 attempt because NOT_FOUND is not retryable
      expect(mocks.sendQueryUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
