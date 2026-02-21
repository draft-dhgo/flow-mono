import { describe, it, expect, vi } from 'vitest';
import {
  StartNextWorkExecutionUseCase,
  WorkflowRunNotFoundError,
  WorkflowSpaceNotFoundError,
} from '@workflow-runtime/application/commands/start-next-work-execution-use-case.js';
import { WorkflowRun, WorkExecution, WorkflowSpace } from '@workflow-runtime/domain/index.js';
import type {
  WorkflowRunRepository, WorkExecutionRepository,
  WorkflowSpaceRepository, ReportRepository, WorkTreeRepository, EventPublisher,
} from '@workflow-runtime/domain/index.js';
import type { AgentService, McpServerReader } from '@common/ports/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import { WorkflowRunId, WorkNodeConfig, TaskNodeConfig } from '@workflow-runtime/domain/value-objects/index.js';
import { WorkExecutionFactory } from '@workflow-runtime/application/factories/work-execution-factory.js';
import { WorkspacePathFactory } from '@workflow-runtime/application/factories/workspace-path-factory.js';
import type { FileSystem } from '@workflow-runtime/domain/ports/file-system.js';

const WF_ID = 'wf-001' as WorkflowId;

function makeWorkNodeConfig(sequence: number): WorkNodeConfig {
  return WorkNodeConfig.create({
    sequence,
    model: 'claude-sonnet',
    taskConfigs: [TaskNodeConfig.create(0, 'test query')],
  });
}

function createMockWorkflowSpace(workflowRunId: string) {
  return WorkflowSpace.create({
    workflowRunId: workflowRunId as WorkflowRunId,
    path: `/tmp/test-spaces/${workflowRunId}`,
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
  const reportRepository: ReportRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const workflowSpaceRepository: WorkflowSpaceRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn().mockResolvedValue(null),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const mcpServerReader: McpServerReader = {
    findByIds: vi.fn().mockResolvedValue([]),
  };
  const agentService: AgentService = {
    startSession: vi.fn().mockResolvedValue({ sessionId: 'session-1', processId: 'pid-1', isAssigned: true }),
    stopSession: vi.fn(),
    deleteSession: vi.fn(),
    sendQuery: vi.fn(),
    findSessionByWorkExecutionId: vi.fn(),
    startSessionForWorkspace: vi.fn(),
    sendQueryForWorkspace: vi.fn(),
    stopSessionForWorkspace: vi.fn(),
  };
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  const workTreeRepository: WorkTreeRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const workExecutionFactory = new WorkExecutionFactory();
  const workspacePathFactory = new WorkspacePathFactory('/tmp/test-spaces');
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
  return {
    workflowRunRepository, workExecutionRepository, reportRepository,
    workflowSpaceRepository, workTreeRepository, mcpServerReader, agentService, eventPublisher,
    workExecutionFactory, workspacePathFactory, fileSystem,
  };
}

function createUseCase(mocks: ReturnType<typeof createMocks>) {
  return new StartNextWorkExecutionUseCase(
    mocks.workflowRunRepository as never,
    mocks.workExecutionRepository as never,
    mocks.reportRepository as never,
    mocks.workflowSpaceRepository as never,
    mocks.workTreeRepository as never,
    mocks.mcpServerReader as never,
    mocks.agentService as never,
    mocks.eventPublisher as never,
    mocks.workExecutionFactory as never,
    mocks.workspacePathFactory as never,
    mocks.fileSystem as never,
  );
}

describe('StartNextWorkExecutionUseCase', () => {
  it('throws WorkflowRunNotFoundError when not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(null);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workflowRunId: 'nonexistent' as WorkflowRunId }),
    ).rejects.toThrow(WorkflowRunNotFoundError);
  });

  it('returns gracefully for non-running run (not active)', async () => {
    const mocks = createMocks();
    const run = WorkflowRun.create({
      workflowId: WF_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [makeWorkNodeConfig(0)],
    });
    // INITIALIZED, not RUNNING
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const useCase = createUseCase(mocks);
    const result = await useCase.execute({ workflowRunId: run.id });

    expect(result.workExecutionId).toBeNull();
    expect(result.isComplete).toBe(false);
  });

  it('throws WorkflowSpaceNotFoundError when WorkflowSpace does not exist', async () => {
    const mocks = createMocks();
    const run = WorkflowRun.create({
      workflowId: WF_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [makeWorkNodeConfig(0)],
    });
    const we = WorkExecution.create({
      workflowRunId: run.id,
      workflowId: WF_ID,
      sequence: 0,
      model: 'claude-sonnet',
      taskProps: [{ order: 0, query: 'test' }],
    });
    run.addWorkExecution(we.id);
    run.start();
    run.clearDomainEvents();

    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);
    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(we);
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(null);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workflowRunId: run.id }),
    ).rejects.toThrow(WorkflowSpaceNotFoundError);
  });

  it('starts agent session for current work execution', async () => {
    const mocks = createMocks();
    const run = WorkflowRun.create({
      workflowId: WF_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [makeWorkNodeConfig(0)],
    });
    const we = WorkExecution.create({
      workflowRunId: run.id,
      workflowId: WF_ID,
      sequence: 0,
      model: 'claude-sonnet',
      taskProps: [{ order: 0, query: 'test' }],
    });
    run.addWorkExecution(we.id);
    run.start();
    run.clearDomainEvents();

    const workflowSpace = createMockWorkflowSpace(run.id);

    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);
    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(we);
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(workflowSpace);

    const useCase = createUseCase(mocks);
    const result = await useCase.execute({ workflowRunId: run.id });

    expect(result.workExecutionId).toBe(we.id);
    expect(result.isComplete).toBe(false);
    expect(mocks.agentService.startSession).toHaveBeenCalledOnce();
    expect(mocks.agentService.startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        workspacePath: expect.stringContaining('/workspaces/'),
      }),
    );
    expect(mocks.fileSystem.createDirectory).toHaveBeenCalledOnce();
  });
});
