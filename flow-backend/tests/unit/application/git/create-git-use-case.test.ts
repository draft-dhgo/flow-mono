import { describe, it, expect, vi } from 'vitest';
import { CreateGitUseCase, GitCloneError, GitDuplicateUrlError } from '@git/application/commands/create-git-use-case.js';
import { GitRepoPathFactory } from '@git/application/factories/git-repo-path-factory.js';
import { Git, GitUrl } from '@git/domain/index.js';
import type { GitRepository, GitClient } from '@git/domain/ports/index.js';
import type { EventPublisher } from '@common/ports/index.js';

function createMocks() {
  const gitRepository: GitRepository = {
    findById: vi.fn(),
    findByUrl: vi.fn().mockResolvedValue(null),
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
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  const gitRepoPathFactory = new GitRepoPathFactory('/tmp/flowflow-repos');
  return { gitRepository, gitClient, eventPublisher, gitRepoPathFactory };
}

describe('CreateGitUseCase', () => {
  it('creates git repo and publishes events', async () => {
    const mocks = createMocks();
    const useCase = new CreateGitUseCase(mocks.gitRepository, mocks.gitClient, mocks.eventPublisher, mocks.gitRepoPathFactory);

    const result = await useCase.execute({
      url: 'https://github.com/user/repo.git',
      localPath: 'user/repo',
    });

    expect(result.url).toBe('https://github.com/user/repo.git');
    expect(result.localPath).toBe('user/repo');
    expect(result.gitId).toBeDefined();
    expect(mocks.gitClient.clone).toHaveBeenCalledWith(
      expect.objectContaining({ localPath: '/tmp/flowflow-repos/user/repo' }),
    );
    expect(mocks.gitRepository.save).toHaveBeenCalledOnce();
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalledOnce();
  });

  it('throws GitCloneError when clone fails', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.gitClient.clone).mockRejectedValue(new Error('network error'));
    const useCase = new CreateGitUseCase(mocks.gitRepository, mocks.gitClient, mocks.eventPublisher, mocks.gitRepoPathFactory);

    await expect(
      useCase.execute({ url: 'https://github.com/user/repo.git', localPath: 'user/repo' }),
    ).rejects.toThrow(GitCloneError);

    expect(mocks.gitRepository.save).not.toHaveBeenCalled();
  });

  it('throws on invalid URL', async () => {
    const mocks = createMocks();
    const useCase = new CreateGitUseCase(mocks.gitRepository, mocks.gitClient, mocks.eventPublisher, mocks.gitRepoPathFactory);

    await expect(
      useCase.execute({ url: '', localPath: 'user/repo' }),
    ).rejects.toThrow();
  });

  it('throws GitDuplicateUrlError when URL already exists', async () => {
    const mocks = createMocks();
    const existingGit = Git.create({
      url: GitUrl.create('https://github.com/user/repo.git'),
      localPath: 'user/repo',
    });
    vi.mocked(mocks.gitRepository.findByUrl).mockResolvedValue(existingGit);
    const useCase = new CreateGitUseCase(mocks.gitRepository, mocks.gitClient, mocks.eventPublisher, mocks.gitRepoPathFactory);

    await expect(
      useCase.execute({ url: 'https://github.com/user/repo.git', localPath: 'user/repo' }),
    ).rejects.toThrow(GitDuplicateUrlError);

    expect(mocks.gitClient.clone).not.toHaveBeenCalled();
    expect(mocks.gitRepository.save).not.toHaveBeenCalled();
  });
});
