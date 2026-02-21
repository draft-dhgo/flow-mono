import { describe, it, expect, vi } from 'vitest';
import {
  StartWorkflowRunUseCase,
  WorkflowNotFoundError,
} from '@workflow-runtime/application/commands/start-workflow-run-use-case.js';
import { WorkflowRunFactory } from '@workflow-runtime/application/factories/workflow-run-factory.js';
import { WorkspacePathFactory } from '@workflow-runtime/application/factories/workspace-path-factory.js';
import { WorkflowRunStatus } from '@workflow-runtime/domain/value-objects/index.js';
import type {
  WorkflowRunRepository, WorkflowSpaceRepository, WorkTreeRepository,
  EventPublisher,
} from '@workflow-runtime/domain/index.js';
import type { FileSystem } from '@workflow-runtime/domain/ports/file-system.js';
import type { WorkflowConfigReader, WorkflowConfig, GitReader, GitService } from '@common/ports/index.js';
import type { WorkflowId, GitId } from '@common/ids/index.js';

const WF_ID = 'wf-001' as WorkflowId;
const GIT_ID = 'git-001' as GitId;

function createMocks() {
  const workflowConfigReader: WorkflowConfigReader = {
    findById: vi.fn(),
  };
  const workflowRunFactory = new WorkflowRunFactory();
  const workflowRunRepository: WorkflowRunRepository = {
    findById: vi.fn(),
    findByWorkflowId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  const workflowSpaceRepository: WorkflowSpaceRepository = {
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
  const gitReader: GitReader = {
    findByIds: vi.fn().mockResolvedValue([]),
  };
  const gitService: GitService = {
    clone: vi.fn(),
    createWorktree: vi.fn(),
    deleteWorktree: vi.fn(),
    deleteRepo: vi.fn(),
    getCurrentCommit: vi.fn(),
    getCurrentBranch: vi.fn<() => Promise<string>>().mockResolvedValue('main'),
    reset: vi.fn(),
    branchExists: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
    deleteBranch: vi.fn(),
    fetch: vi.fn(),
    removeWorktreeForBranch: vi.fn(),
    push: vi.fn(),
    installPrePushHook: vi.fn(),
    unsetUpstream: vi.fn(),
    getCommitCount: vi.fn<() => Promise<number>>().mockResolvedValue(0),
    getLog: vi.fn().mockResolvedValue([]),
    diff: vi.fn().mockResolvedValue([]),
    getFileAtRef: vi.fn<() => Promise<string>>().mockResolvedValue(''),
    merge: vi.fn(),
  };
  const workspacePathFactory = new WorkspacePathFactory('/tmp/test-spaces');
  return {
    workflowConfigReader, workflowRunFactory,
    workflowRunRepository, eventPublisher,
    workflowSpaceRepository, workTreeRepository,
    fileSystem, gitReader, gitService, workspacePathFactory,
  };
}

function createUseCase(mocks: ReturnType<typeof createMocks>) {
  return new StartWorkflowRunUseCase(
    mocks.workflowConfigReader as never,
    mocks.workflowRunFactory,
    mocks.workflowRunRepository as never,
    mocks.eventPublisher as never,
    mocks.workflowSpaceRepository as never,
    mocks.workTreeRepository as never,
    mocks.fileSystem as never,
    mocks.gitReader as never,
    mocks.gitService as never,
    mocks.workspacePathFactory,
  );
}

function createWorkflowConfig(options?: { withReport?: boolean; withGitRefs?: boolean }): WorkflowConfig {
  const taskDefinitions = [
    { order: 0, query: 'Task 0' },
    {
      order: 1,
      query: 'Task 1',
      ...(options?.withReport
        ? { reportOutline: { sections: [{ title: 'Summary', description: 'A summary section' }] } }
        : {}),
    },
  ];
  const gitRefs = options?.withGitRefs
    ? [{ gitId: GIT_ID, baseBranch: 'main' }]
    : [];
  return {
    id: WF_ID,
    name: 'Test Workflow',
    status: 'ACTIVE',
    branchStrategy: 'feature/{issueKey}',
    gitRefs,
    mcpServerRefs: [],
    seedKeys: [],
    workDefinitions: [
      {
        order: 0,
        model: 'claude-sonnet',
        pauseAfter: false,
        taskDefinitions,
        mcpServerRefs: [],
        gitRefs,
      },
    ],
  };
}

describe('StartWorkflowRunUseCase', () => {
  it('starts a workflow run successfully', async () => {
    const mocks = createMocks();
    const config = createWorkflowConfig();
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(config);

    const useCase = createUseCase(mocks);
    const result = await useCase.execute({ workflowId: WF_ID, issueKey: 'TEST-001' });

    expect(result.workflowRunId).toBeDefined();
    expect(result.status).toBe(WorkflowRunStatus.RUNNING);
    expect(mocks.workflowRunRepository.save).toHaveBeenCalledOnce();
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalledOnce();
  });

  it('throws WorkflowNotFoundError for unknown workflow', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(null);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workflowId: WF_ID, issueKey: 'TEST-001' }),
    ).rejects.toThrow(WorkflowNotFoundError);
  });

  it('publishes domain events from run', async () => {
    const mocks = createMocks();
    const config = createWorkflowConfig();
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(config);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowId: WF_ID, issueKey: 'TEST-001' });

    const publishedEvents = vi.mocked(mocks.eventPublisher.publishAll).mock.calls[0][0];
    expect(publishedEvents.length).toBeGreaterThanOrEqual(2);

    const eventTypes = publishedEvents.map(e => e.eventType);
    expect(eventTypes).toContain('workflow-run.created');
    expect(eventTypes).toContain('workflow-run.started');
  });

  it('creates WorkflowSpace with filesystem directory', async () => {
    const mocks = createMocks();
    const config = createWorkflowConfig();
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(config);

    const useCase = createUseCase(mocks);
    const result = await useCase.execute({ workflowId: WF_ID, issueKey: 'TEST-001' });

    expect(mocks.fileSystem.createDirectory).toHaveBeenCalledWith(
      `/tmp/test-spaces/${result.workflowRunId}`,
    );
    expect(mocks.workflowSpaceRepository.save).toHaveBeenCalledOnce();
    const savedSpace = vi.mocked(mocks.workflowSpaceRepository.save).mock.calls[0][0];
    expect(savedSpace.workflowRunId).toBe(result.workflowRunId);
    expect(savedSpace.path).toBe(`/tmp/test-spaces/${result.workflowRunId}`);
  });

  it('creates WorkTrees for each git ref in the pool', async () => {
    const mocks = createMocks();
    const config = createWorkflowConfig({ withGitRefs: true });
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(config);
    vi.mocked(mocks.gitReader.findByIds).mockResolvedValue([
      { id: GIT_ID, url: 'https://github.com/test/repo.git', localPath: '/repos/test' },
    ]);

    const useCase = createUseCase(mocks);
    const result = await useCase.execute({ workflowId: WF_ID, issueKey: 'TEST-001' });

    expect(mocks.gitService.createWorktree).toHaveBeenCalledWith({
      repoPath: '/repos/test',
      worktreePath: `/tmp/test-spaces/${result.workflowRunId}/work-trees/${GIT_ID}`,
      baseBranch: 'main',
      newBranchName: 'feature/TEST-001',
    });
    expect(mocks.workTreeRepository.save).toHaveBeenCalledOnce();
    const savedTree = vi.mocked(mocks.workTreeRepository.save).mock.calls[0][0];
    expect(savedTree.gitId).toBe(GIT_ID);
    expect(savedTree.branch).toBe('main');
  });

  it('deletes existing branch before creating worktree on re-execution', async () => {
    const mocks = createMocks();
    const config = createWorkflowConfig({ withGitRefs: true });
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(config);
    vi.mocked(mocks.gitReader.findByIds).mockResolvedValue([
      { id: GIT_ID, url: 'https://github.com/test/repo.git', localPath: '/repos/test' },
    ]);
    vi.mocked(mocks.gitService.branchExists).mockResolvedValue(true);

    const useCase = createUseCase(mocks);
    const result = await useCase.execute({ workflowId: WF_ID, issueKey: 'TEST-001' });

    expect(mocks.gitService.fetch).toHaveBeenCalledWith('/repos/test');
    expect(mocks.gitService.branchExists).toHaveBeenCalledWith('/repos/test', 'feature/TEST-001');
    expect(mocks.gitService.removeWorktreeForBranch).toHaveBeenCalledWith('/repos/test', 'feature/TEST-001');
    expect(mocks.gitService.deleteBranch).toHaveBeenCalledWith('/repos/test', 'feature/TEST-001');
    expect(mocks.gitService.createWorktree).toHaveBeenCalledWith({
      repoPath: '/repos/test',
      worktreePath: `/tmp/test-spaces/${result.workflowRunId}/work-trees/${GIT_ID}`,
      baseBranch: 'main',
      newBranchName: 'feature/TEST-001',
    });
  });

  it('skips WorkTree creation when no git refs exist', async () => {
    const mocks = createMocks();
    const config = createWorkflowConfig({ withGitRefs: false });
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(config);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowId: WF_ID, issueKey: 'TEST-001' });

    expect(mocks.gitReader.findByIds).not.toHaveBeenCalled();
    expect(mocks.gitService.createWorktree).not.toHaveBeenCalled();
    expect(mocks.workTreeRepository.save).not.toHaveBeenCalled();
  });
});
