import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateGitUseCase } from '@git/application/commands/create-git-use-case.js';
import { DeleteGitUseCase } from '@git/application/commands/delete-git-use-case.js';
import { GitRepoPathFactory } from '@git/application/factories/git-repo-path-factory.js';
import { InMemoryGitRepository } from '@git/infra/in-memory-git-repository.js';
import { InMemoryGitWorkflowRefStore } from '@git/infra/in-memory-git-workflow-ref-store.js';
import { InMemoryWorkflowRepository } from '@workflow/infra/in-memory-workflow-repository.js';
import { InMemoryEventPublisher } from '@common/infra/in-memory-event-publisher.js';
import { GitDeletedHandler } from '@workflow/application/event-handlers/git-deleted-handler.js';
import { Workflow } from '@workflow/domain/entities/workflow.js';
import { BranchStrategy, GitRef, WorkDefinition, TaskDefinition, AgentModel } from '@workflow/domain/value-objects/index.js';
import { GitDeleted } from '@common/events/index.js';
import type { GitClient } from '@git/domain/ports/git-client.js';
import type { GitId } from '@common/ids/index.js';

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

describe('Workflow-Git Cascade Integration', () => {
  let gitRepository: InMemoryGitRepository;
  let gitWorkflowRefStore: InMemoryGitWorkflowRefStore;
  let workflowRepository: InMemoryWorkflowRepository;
  let eventPublisher: InMemoryEventPublisher;
  let gitClient: GitClient;
  let gitRepoPathFactory: GitRepoPathFactory;

  beforeEach(() => {
    gitRepository = new InMemoryGitRepository();
    gitWorkflowRefStore = new InMemoryGitWorkflowRefStore();
    workflowRepository = new InMemoryWorkflowRepository();
    eventPublisher = new InMemoryEventPublisher();
    gitClient = createStubGitClient();
    gitRepoPathFactory = new GitRepoPathFactory('/tmp/flowflow-repos');
  });

  it('Git deletion cascades to mark gitRef as invalid on referencing Workflow', async () => {
    // 1. Create Git via use case
    const createGitUseCase = new CreateGitUseCase(gitRepository, gitClient, eventPublisher, gitRepoPathFactory);
    const gitResult = await createGitUseCase.execute({
      url: 'https://github.com/user/repo.git',
      localPath: 'user/repo',
    });
    const gitId = gitResult.gitId as GitId;

    // 2. Create Workflow that references this Git
    const taskDef = TaskDefinition.create(0, 'Build the feature');
    const workDef = WorkDefinition.create(
      0,
      AgentModel.create('claude-sonnet-4-5-20250929'),
      [taskDef],
      [GitRef.create(gitId, 'main')],
    );
    const workflow = Workflow.create({
      name: 'Test Workflow',
      branchStrategy: BranchStrategy.create('feature/test'),
      gitRefs: [GitRef.create(gitId, 'main')],
      workDefinitions: [workDef],
    });
    await workflowRepository.save(workflow);
    workflow.clearDomainEvents();

    // Verify workflow has gitRef
    expect(workflow.gitRefs).toHaveLength(1);
    expect(workflow.gitRefs[0].gitId).toBe(gitId);

    // 3. Clear previous events, then subscribe GitDeletedHandler
    eventPublisher.clear();

    const gitDeletedHandler = new GitDeletedHandler(workflowRepository, eventPublisher);
    eventPublisher.subscribe(GitDeleted.EVENT_TYPE, async (event) => {
      await gitDeletedHandler.handle(event as GitDeleted);
    });

    // 4. Delete Git via use case — triggers GitDeleted event → handler runs
    const deleteGitUseCase = new DeleteGitUseCase(gitRepository, gitClient, gitWorkflowRefStore, eventPublisher, gitRepoPathFactory);
    await deleteGitUseCase.execute({ gitId });

    // 5. Verify workflow's gitRef was marked invalid by the cascade
    const updatedWorkflow = await workflowRepository.findById(workflow.id);
    expect(updatedWorkflow).not.toBeNull();
    expect(updatedWorkflow!.gitRefs).toHaveLength(1);
    expect(updatedWorkflow!.gitRefs[0].valid).toBe(false);

    // 6. Verify events: GitDeleted + WorkflowUpdated
    const events = eventPublisher.getPublishedEvents();
    const eventTypes = events.map(e => e.eventType);
    expect(eventTypes).toContain('git.deleted');
    expect(eventTypes).toContain('workflow.updated');
  });
});
