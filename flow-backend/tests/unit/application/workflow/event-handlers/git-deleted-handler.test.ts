import { describe, it, expect, vi } from 'vitest';
import { GitDeletedHandler } from '@workflow/application/event-handlers/git-deleted-handler.js';
import { Workflow, WorkDefinition, TaskDefinition, GitRef, AgentModel } from '@workflow/domain/index.js';
import type { WorkflowRepository } from '@workflow/domain/ports/workflow-repository.js';
import type { EventPublisher } from '@common/ports/index.js';
import { GitDeleted } from '@common/events/index.js';
import type { GitId } from '@common/ids/index.js';

function createMocks() {
  const workflowRepository: WorkflowRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByGitId: vi.fn().mockResolvedValue([]),
    findByMcpServerId: vi.fn(),
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
  return { workflowRepository, eventPublisher };
}

const GIT_ID = 'git-001' as GitId;

function createWorkflow(): Workflow {
  const task = TaskDefinition.create(0, 'Test task');
  const model = AgentModel.create('claude-sonnet-4-5-20250929');
  const gitRef = GitRef.create(GIT_ID, 'main');
  const workDef = WorkDefinition.create(0, model, [task], [gitRef]);
  return Workflow.create({
    name: 'Test',
    branchStrategy: 'feature',
    workDefinitions: [workDef],
    gitRefs: [gitRef],
  });
}

describe('GitDeletedHandler', () => {
  it('marks git ref as invalid on workflows and publishes events', async () => {
    const mocks = createMocks();
    const workflow = createWorkflow();
    vi.mocked(mocks.workflowRepository.findByGitId).mockResolvedValue([workflow]);

    const handler = new GitDeletedHandler(mocks.workflowRepository, mocks.eventPublisher);
    const event = new GitDeleted({ gitId: GIT_ID });

    await handler.handle(event);

    expect(workflow.gitRefs).toHaveLength(1);
    expect(workflow.gitRefs[0].valid).toBe(false);
    expect(mocks.workflowRepository.save).toHaveBeenCalledOnce();
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalled();
  });

  it('does nothing when no workflows reference the git', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRepository.findByGitId).mockResolvedValue([]);

    const handler = new GitDeletedHandler(mocks.workflowRepository, mocks.eventPublisher);
    const event = new GitDeleted({ gitId: GIT_ID });

    await handler.handle(event);

    expect(mocks.workflowRepository.save).not.toHaveBeenCalled();
  });
});
