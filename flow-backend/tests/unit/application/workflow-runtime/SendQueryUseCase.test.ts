import { describe, it, expect, vi } from 'vitest';
import {
  SendQueryUseCase,
  WorkExecutionNotFoundError,
  AgentSessionNotFoundError,
  QueryFailedError,
} from '@workflow-runtime/application/commands/send-query-use-case.js';
import { WorkExecution } from '@workflow-runtime/domain/index.js';
import type { WorkExecutionRepository, ReportRepository, EventPublisher } from '@workflow-runtime/domain/index.js';
import type { AgentService } from '@common/ports/index.js';
import type { FileSystem } from '@workflow-runtime/domain/ports/file-system.js';
import type { WorkflowId } from '@common/ids/index.js';
import { WorkflowRunId, WorkExecutionId } from '@workflow-runtime/domain/value-objects/index.js';

const WF_ID = 'wf-001' as WorkflowId;
const WR_ID = WorkflowRunId.generate();

function createMocks() {
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
  const agentService: AgentService = {
    startSession: vi.fn(),
    stopSession: vi.fn(),
    deleteSession: vi.fn(),
    sendQuery: vi.fn(),
    findSessionByWorkExecutionId: vi.fn(),
    startSessionForWorkspace: vi.fn(),
    sendQueryForWorkspace: vi.fn(),
    stopSessionForWorkspace: vi.fn(),
  };
  const reportRepository: ReportRepository = {
    findById: vi.fn(),
    findByWorkExecutionId: vi.fn(),
    findByWorkflowRunId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
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
  const unitOfWork = { run: async <T>(work: () => Promise<T>) => work() };
  return { workExecutionRepository, reportRepository, agentService, eventPublisher, fileSystem, unitOfWork };
}

function createUseCase(mocks: ReturnType<typeof createMocks>) {
  return new SendQueryUseCase(
    mocks.workExecutionRepository as never,
    mocks.reportRepository as never,
    mocks.agentService as never,
    mocks.eventPublisher as never,
    mocks.fileSystem as never,
    mocks.unitOfWork as never,
  );
}

function createWorkExecution() {
  return WorkExecution.create({
    workflowRunId: WR_ID,
    workflowId: WF_ID,
    sequence: 0,
    model: 'claude-sonnet',
    taskProps: [{ order: 0, query: 'test query' }],
  });
}

describe('SendQueryUseCase', () => {
  it('sends query and returns result', async () => {
    const mocks = createMocks();
    const we = createWorkExecution();
    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(we);
    vi.mocked(mocks.agentService.findSessionByWorkExecutionId).mockResolvedValue({
      sessionId: 'sess-1',
      processId: 'proc-1',
      isAssigned: true,
    });
    vi.mocked(mocks.agentService.sendQuery).mockResolvedValue({
      response: 'answer',
      tokensUsed: 100,
    });

    const useCase = createUseCase(mocks);
    const result = await useCase.execute({ workExecutionId: we.id });

    expect(result.response).toBe('answer');
    expect(result.tokensUsed).toBe(100);
    expect(mocks.workExecutionRepository.save).toHaveBeenCalledOnce();
    expect(mocks.eventPublisher.publish).toHaveBeenCalledOnce();
    expect(mocks.reportRepository.findById).not.toHaveBeenCalled();
  });

  it('throws WorkExecutionNotFoundError when not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(null);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workExecutionId: 'nonexistent' as WorkExecutionId }),
    ).rejects.toThrow(WorkExecutionNotFoundError);
  });

  it('throws AgentSessionNotFoundError when no session', async () => {
    const mocks = createMocks();
    const we = createWorkExecution();
    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(we);
    vi.mocked(mocks.agentService.findSessionByWorkExecutionId).mockResolvedValue(null);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workExecutionId: we.id }),
    ).rejects.toThrow(AgentSessionNotFoundError);
  });

  it('throws QueryFailedError when agent throws', async () => {
    const mocks = createMocks();
    const we = createWorkExecution();
    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(we);
    vi.mocked(mocks.agentService.findSessionByWorkExecutionId).mockResolvedValue({
      sessionId: 'sess-1',
      processId: 'proc-1',
      isAssigned: true,
    });
    vi.mocked(mocks.agentService.sendQuery).mockRejectedValue(new Error('agent error'));

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workExecutionId: we.id }),
    ).rejects.toThrow(QueryFailedError);
  });
});
