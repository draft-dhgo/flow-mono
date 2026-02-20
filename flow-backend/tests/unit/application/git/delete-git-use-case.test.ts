import { describe, it, expect, vi } from 'vitest';
import { DeleteGitUseCase, GitNotFoundError } from '@git/application/commands/delete-git-use-case.js';
import { GitRepoPathFactory } from '@git/application/factories/git-repo-path-factory.js';
import { Git, GitUrl } from '@git/domain/index.js';
import { GitReferencedByWorkflowError } from '@git/domain/errors/git-referenced-by-workflow-error.js';
import type { GitRepository, GitClient, GitWorkflowRefStore } from '@git/domain/ports/index.js';
import type { EventPublisher } from '@common/ports/index.js';
import type { GitId, WorkflowId } from '@common/ids/index.js';

function createMocks() {
  const gitRepository: GitRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByIds: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  const gitClient: GitClient = {
    clone: vi.fn(),
    createWorktree: vi.fn(),
    deleteWorktree: vi.fn(),
    createBranch: vi.fn(),
    deleteBranch: vi.fn(),
    commit: vi.fn(),
    reset: vi.fn(),
    resetToBranch: vi.fn(),
    hasChanges: vi.fn(),
    getCurrentCommit: vi.fn(),
    getCurrentBranch: vi.fn(),
    deleteRepo: vi.fn(),
    branchExists: vi.fn(),
    fetch: vi.fn(),
    pull: vi.fn(),
    add: vi.fn(),
  };
  const gitWorkflowRefStore: GitWorkflowRefStore = {
    addReference: vi.fn(),
    removeReference: vi.fn(),
    removeAllByWorkflowId: vi.fn(),
    findWorkflowIdsByGitId: vi.fn().mockResolvedValue([]),
  };
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  const gitRepoPathFactory = new GitRepoPathFactory('/tmp/flowflow-repos');
  return { gitRepository, gitClient, gitWorkflowRefStore, eventPublisher, gitRepoPathFactory };
}

describe('DeleteGitUseCase', () => {
  it('deletes git and publishes events when no workflow references exist', async () => {
    const mocks = createMocks();
    const git = Git.create({ url: GitUrl.create('https://github.com/user/repo.git'), localPath: 'user/repo' });
    vi.mocked(mocks.gitRepository.findById).mockResolvedValue(git);
    vi.mocked(mocks.gitWorkflowRefStore.findWorkflowIdsByGitId).mockResolvedValue([]);

    const useCase = new DeleteGitUseCase(mocks.gitRepository, mocks.gitClient, mocks.gitWorkflowRefStore, mocks.eventPublisher, mocks.gitRepoPathFactory);
    await useCase.execute({ gitId: git.id });

    expect(mocks.gitWorkflowRefStore.findWorkflowIdsByGitId).toHaveBeenCalledWith(git.id);
    expect(mocks.gitClient.deleteRepo).toHaveBeenCalledWith('/tmp/flowflow-repos/user/repo');
    expect(mocks.gitRepository.delete).toHaveBeenCalledWith(git.id);
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalledOnce();
  });

  it('throws GitReferencedByWorkflowError when workflows reference the git', async () => {
    const mocks = createMocks();
    const git = Git.create({ url: GitUrl.create('https://github.com/user/repo.git'), localPath: 'user/repo' });
    vi.mocked(mocks.gitRepository.findById).mockResolvedValue(git);
    vi.mocked(mocks.gitWorkflowRefStore.findWorkflowIdsByGitId).mockResolvedValue(['wf-1' as WorkflowId]);

    const useCase = new DeleteGitUseCase(mocks.gitRepository, mocks.gitClient, mocks.gitWorkflowRefStore, mocks.eventPublisher, mocks.gitRepoPathFactory);
    await expect(
      useCase.execute({ gitId: git.id }),
    ).rejects.toThrow(GitReferencedByWorkflowError);

    expect(mocks.gitClient.deleteRepo).not.toHaveBeenCalled();
    expect(mocks.gitRepository.delete).not.toHaveBeenCalled();
  });

  it('throws GitNotFoundError when git not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.gitRepository.findById).mockResolvedValue(null);

    const useCase = new DeleteGitUseCase(mocks.gitRepository, mocks.gitClient, mocks.gitWorkflowRefStore, mocks.eventPublisher, mocks.gitRepoPathFactory);
    await expect(
      useCase.execute({ gitId: 'nonexistent' as GitId }),
    ).rejects.toThrow(GitNotFoundError);
  });
});
