import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateGitUseCase } from '@git/application/commands/create-git-use-case.js';
import { DeleteGitUseCase } from '@git/application/commands/delete-git-use-case.js';
import { GitRepoPathFactory } from '@git/application/factories/git-repo-path-factory.js';
import { InMemoryGitRepository } from '@git/infra/in-memory-git-repository.js';
import { InMemoryGitWorkflowRefStore } from '@git/infra/in-memory-git-workflow-ref-store.js';
import { InMemoryEventPublisher } from '@common/infra/in-memory-event-publisher.js';
import type { GitClient } from '@git/domain/ports/git-client.js';

function createStubGitClient(): GitClient {
  return {
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
}

describe('Git Lifecycle Integration', () => {
  let gitRepository: InMemoryGitRepository;
  let gitWorkflowRefStore: InMemoryGitWorkflowRefStore;
  let eventPublisher: InMemoryEventPublisher;
  let gitClient: GitClient;
  let gitRepoPathFactory: GitRepoPathFactory;

  beforeEach(() => {
    gitRepository = new InMemoryGitRepository();
    gitWorkflowRefStore = new InMemoryGitWorkflowRefStore();
    eventPublisher = new InMemoryEventPublisher();
    gitClient = createStubGitClient();
    gitRepoPathFactory = new GitRepoPathFactory('/tmp/flowflow-repos');
  });

  it('CreateGit saves to repository and publishes GitCreated event', async () => {
    const createUseCase = new CreateGitUseCase(gitRepository, gitClient, eventPublisher, gitRepoPathFactory);

    const result = await createUseCase.execute({
      url: 'https://github.com/user/repo.git',
      localPath: 'user/repo',
    });

    // Verify saved to repository
    const saved = await gitRepository.findById(result.gitId as ReturnType<typeof gitRepository.findById> extends Promise<infer T> ? (T extends null ? never : T) : never extends { id: infer I } ? I : never);
    expect(saved).not.toBeNull();

    // Verify GitCreated event published
    const events = eventPublisher.getPublishedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('git.created');
  });

  it('DeleteGit removes from repository and publishes GitDeleted event', async () => {
    const createUseCase = new CreateGitUseCase(gitRepository, gitClient, eventPublisher, gitRepoPathFactory);
    const deleteUseCase = new DeleteGitUseCase(gitRepository, gitClient, gitWorkflowRefStore, eventPublisher, gitRepoPathFactory);

    // Create first
    const result = await createUseCase.execute({
      url: 'https://github.com/user/repo.git',
      localPath: 'user/repo',
    });

    eventPublisher.clear();

    // Delete
    const gitId = result.gitId as Parameters<typeof gitRepository.findById>[0];
    await deleteUseCase.execute({ gitId });

    // Verify removed from repository
    const found = await gitRepository.findById(gitId);
    expect(found).toBeNull();

    // Verify GitDeleted event published
    const events = eventPublisher.getPublishedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('git.deleted');
  });
});
