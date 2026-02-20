import { describe, it, expect, vi } from 'vitest';
import {
  UpdateWorkflowUseCase,
  WorkflowNotFoundError,
} from '@workflow/application/commands/update-workflow-use-case.js';
import { Workflow, WorkDefinition, TaskDefinition, GitRef, AgentModel, BranchStrategy } from '@workflow/domain/index.js';
import type { WorkflowRepository } from '@workflow/domain/ports/workflow-repository.js';
import type { EventPublisher, GitReferenceChecker, McpServerReferenceChecker } from '@common/ports/index.js';
import type { GitId, WorkflowId } from '@common/ids/index.js';

const GIT_ID = 'git-001' as GitId;

function createMocks() {
  const workflowRepository: WorkflowRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByGitId: vi.fn(),
    findByMcpServerId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  const gitReferenceChecker: GitReferenceChecker = {
    findByIds: vi.fn().mockResolvedValue([]),
  };
  const mcpServerReferenceChecker: McpServerReferenceChecker = {
    findByIds: vi.fn().mockResolvedValue([]),
  };
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  return { workflowRepository, gitReferenceChecker, mcpServerReferenceChecker, eventPublisher };
}

function createWorkflow() {
  const task = TaskDefinition.create(0, 'Do something');
  const model = AgentModel.create('claude-sonnet-4-5-20250929');
  const workDef = WorkDefinition.create(0, model, [task]);
  const gitRef = GitRef.create(GIT_ID, 'main');
  const workflow = Workflow.create({
    name: 'Test Workflow',
    branchStrategy: BranchStrategy.create('feature'),
    workDefinitions: [workDef],
    gitRefs: [gitRef],
  });
  workflow.clearDomainEvents();
  return workflow;
}

describe('UpdateWorkflowUseCase', () => {
  it('updates workflow name and publishes events', async () => {
    const mocks = createMocks();
    const workflow = createWorkflow();
    vi.mocked(mocks.workflowRepository.findById).mockResolvedValue(workflow);

    const useCase = new UpdateWorkflowUseCase(
      mocks.workflowRepository,
      mocks.gitReferenceChecker,
      mocks.mcpServerReferenceChecker,
      mocks.eventPublisher,
    );

    await useCase.execute({ workflowId: workflow.id, name: 'Updated Name' });

    expect(workflow.name).toBe('Updated Name');
    expect(mocks.workflowRepository.save).toHaveBeenCalledOnce();
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalledOnce();
  });

  it('throws WorkflowNotFoundError when not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRepository.findById).mockResolvedValue(null);

    const useCase = new UpdateWorkflowUseCase(
      mocks.workflowRepository,
      mocks.gitReferenceChecker,
      mocks.mcpServerReferenceChecker,
      mocks.eventPublisher,
    );

    await expect(useCase.execute({ workflowId: 'nonexistent' as WorkflowId })).rejects.toThrow(WorkflowNotFoundError);
    expect(mocks.workflowRepository.save).not.toHaveBeenCalled();
  });
});
