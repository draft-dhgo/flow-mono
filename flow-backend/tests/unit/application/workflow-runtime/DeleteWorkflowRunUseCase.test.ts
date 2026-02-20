import { describe, it, expect, vi } from 'vitest';
import {
  DeleteWorkflowRunUseCase,
  WorkflowRunNotFoundError,
  WorkflowRunNotTerminalError,
} from '@workflow-runtime/application/commands/delete-workflow-run-use-case.js';
import { WorkflowRun, WorkTree } from '@workflow-runtime/domain/index.js';
import type {
  WorkflowRunRepository, WorkExecutionRepository, ReportRepository,
  CheckpointRepository, WorkflowSpaceRepository, WorkTreeRepository, FileSystem,
} from '@workflow-runtime/domain/index.js';
import type { WorkflowId, GitId } from '@common/ids/index.js';
import type { GitService, GitReader, WorkflowConfigReader, WorkflowConfig } from '@common/ports/index.js';
import { WorkflowRunId, WorkExecutionId, WorkNodeConfig, TaskNodeConfig } from '@workflow-runtime/domain/value-objects/index.js';

const WF_ID = 'wf-001' as WorkflowId;
const GIT_ID = 'git-001' as GitId;

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
  const reportRepository: ReportRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn(),
    save: vi.fn(),
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
  const workflowSpaceRepository: WorkflowSpaceRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn().mockResolvedValue(null),
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
  const gitService: GitService = {
    clone: vi.fn(),
    createWorktree: vi.fn(),
    deleteWorktree: vi.fn(),
    deleteRepo: vi.fn(),
    getCurrentCommit: vi.fn(),
    reset: vi.fn(),
    branchExists: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
    deleteBranch: vi.fn(),
    fetch: vi.fn(),
    removeWorktreeForBranch: vi.fn(),
  };
  const gitReader: GitReader = {
    findByIds: vi.fn().mockResolvedValue([]),
  };
  const workflowConfigReader: WorkflowConfigReader = {
    findById: vi.fn().mockResolvedValue(null),
  };
  return { workflowRunRepository, workExecutionRepository, reportRepository, checkpointRepository, workflowSpaceRepository, workTreeRepository, fileSystem, gitService, gitReader, workflowConfigReader };
}

function createUseCase(mocks: ReturnType<typeof createMocks>) {
  return new DeleteWorkflowRunUseCase(
    mocks.workflowRunRepository as never,
    mocks.workExecutionRepository as never,
    mocks.reportRepository as never,
    mocks.checkpointRepository as never,
    mocks.workflowSpaceRepository as never,
    mocks.workTreeRepository as never,
    mocks.fileSystem as never,
    mocks.gitService as never,
    mocks.gitReader as never,
    mocks.workflowConfigReader as never,
  );
}

function createWorkflowConfig(): WorkflowConfig {
  return {
    id: WF_ID,
    name: 'Test Workflow',
    status: 'ACTIVE',
    branchStrategy: 'feature/{issueKey}',
    gitRefs: [{ gitId: GIT_ID, baseBranch: 'main' }],
    mcpServerRefs: [],
    workDefinitions: [],
  };
}

function createCompletedRun(): WorkflowRun {
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
  run.clearDomainEvents();
  return run;
}

describe('DeleteWorkflowRunUseCase', () => {
  it('deletes a completed workflow run', async () => {
    const mocks = createMocks();
    const run = createCompletedRun();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowRunId: run.id });

    expect(mocks.workflowRunRepository.delete).toHaveBeenCalledWith(run.id);
    expect(mocks.workExecutionRepository.deleteByWorkflowRunId).toHaveBeenCalledWith(run.id);
    expect(mocks.reportRepository.deleteByWorkflowRunId).toHaveBeenCalledWith(run.id);
    expect(mocks.checkpointRepository.deleteByWorkflowRunId).toHaveBeenCalledWith(run.id);
  });

  it('throws WorkflowRunNotFoundError when not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(null);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workflowRunId: 'nonexistent' as WorkflowRunId }),
    ).rejects.toThrow(WorkflowRunNotFoundError);
  });

  it('throws WorkflowRunNotTerminalError for running run', async () => {
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
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workflowRunId: run.id }),
    ).rejects.toThrow(WorkflowRunNotTerminalError);
  });

  it('removes git worktree and deletes branch on cleanup', async () => {
    const mocks = createMocks();
    const run = createCompletedRun();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const workTree = WorkTree.create({
      gitId: GIT_ID,
      workflowRunId: run.id,
      path: '/worktrees/run-1/git-001',
      branch: 'main',
    });
    vi.mocked(mocks.workTreeRepository.findByWorkflowRunId).mockResolvedValue([workTree]);
    vi.mocked(mocks.gitReader.findByIds).mockResolvedValue([
      { id: GIT_ID, url: 'https://github.com/test/repo.git', localPath: '/repos/repo' },
    ]);
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(createWorkflowConfig());
    vi.mocked(mocks.gitService.branchExists).mockResolvedValue(true);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowRunId: run.id });

    expect(mocks.gitService.deleteWorktree).toHaveBeenCalledWith('/repos/repo', '/worktrees/run-1/git-001');
    expect(mocks.gitService.branchExists).toHaveBeenCalledWith('/repos/repo', 'feature/TEST-001');
    expect(mocks.gitService.deleteBranch).toHaveBeenCalledWith('/repos/repo', 'feature/TEST-001');
  });

  it('falls back to fileSystem when git info is not found', async () => {
    const mocks = createMocks();
    const run = createCompletedRun();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const workTree = WorkTree.create({
      gitId: GIT_ID,
      workflowRunId: run.id,
      path: '/worktrees/run-1/git-001',
      branch: 'main',
    });
    vi.mocked(mocks.workTreeRepository.findByWorkflowRunId).mockResolvedValue([workTree]);
    vi.mocked(mocks.gitReader.findByIds).mockResolvedValue([]);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowRunId: run.id });

    expect(mocks.gitService.deleteWorktree).not.toHaveBeenCalled();
    expect(mocks.fileSystem.deleteDirectory).toHaveBeenCalledWith('/worktrees/run-1/git-001');
  });

  it('skips branch deletion when branch does not exist', async () => {
    const mocks = createMocks();
    const run = createCompletedRun();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const workTree = WorkTree.create({
      gitId: GIT_ID,
      workflowRunId: run.id,
      path: '/worktrees/run-1/git-001',
      branch: 'main',
    });
    vi.mocked(mocks.workTreeRepository.findByWorkflowRunId).mockResolvedValue([workTree]);
    vi.mocked(mocks.gitReader.findByIds).mockResolvedValue([
      { id: GIT_ID, url: 'https://github.com/test/repo.git', localPath: '/repos/repo' },
    ]);
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(createWorkflowConfig());
    vi.mocked(mocks.gitService.branchExists).mockResolvedValue(false);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowRunId: run.id });

    expect(mocks.gitService.deleteBranch).not.toHaveBeenCalled();
  });

  it('skips branch deletion when workflow config is not found', async () => {
    const mocks = createMocks();
    const run = createCompletedRun();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const workTree = WorkTree.create({
      gitId: GIT_ID,
      workflowRunId: run.id,
      path: '/worktrees/run-1/git-001',
      branch: 'main',
    });
    vi.mocked(mocks.workTreeRepository.findByWorkflowRunId).mockResolvedValue([workTree]);
    vi.mocked(mocks.gitReader.findByIds).mockResolvedValue([
      { id: GIT_ID, url: 'https://github.com/test/repo.git', localPath: '/repos/repo' },
    ]);
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(null);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowRunId: run.id });

    expect(mocks.gitService.branchExists).not.toHaveBeenCalled();
    expect(mocks.gitService.deleteBranch).not.toHaveBeenCalled();
  });
});
