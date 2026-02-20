import { describe, it, expect, vi } from 'vitest';
import {
  DeleteWorkflowUseCase,
  WorkflowNotFoundForDeletionError,
  WorkflowHasActiveRunsError,
} from '@workflow/application/commands/delete-workflow-use-case.js';
import { Workflow, WorkDefinition, TaskDefinition, GitRef, AgentModel, BranchStrategy } from '@workflow/domain/index.js';
import type { WorkflowRepository } from '@workflow/domain/ports/workflow-repository.js';
import type { EventPublisher, WorkflowRunActiveChecker } from '@common/ports/index.js';
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
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  const workflowRunActiveChecker: WorkflowRunActiveChecker = {
    hasActiveRuns: vi.fn().mockResolvedValue(false),
  };
  return { workflowRepository, eventPublisher, workflowRunActiveChecker };
}

function createWorkflow() {
  const task = TaskDefinition.create(0, 'Do something');
  const model = AgentModel.create('claude-sonnet-4-5-20250929');
  const workDef = WorkDefinition.create(0, model, [task]);
  const gitRef = GitRef.create(GIT_ID, 'main');
  return Workflow.create({
    name: 'Test Workflow',
    branchStrategy: BranchStrategy.create('feature'),
    workDefinitions: [workDef],
    gitRefs: [gitRef],
  });
}

describe('DeleteWorkflowUseCase', () => {
  it('deletes workflow and publishes events', async () => {
    const mocks = createMocks();
    const workflow = createWorkflow();
    vi.mocked(mocks.workflowRepository.findById).mockResolvedValue(workflow);

    const useCase = new DeleteWorkflowUseCase(
      mocks.workflowRepository,
      mocks.eventPublisher,
      mocks.workflowRunActiveChecker,
    );
    await useCase.execute({ workflowId: workflow.id });

    expect(mocks.workflowRepository.delete).toHaveBeenCalledWith(workflow.id);
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalledOnce();
  });

  it('throws WorkflowNotFoundForDeletionError when not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRepository.findById).mockResolvedValue(null);

    const useCase = new DeleteWorkflowUseCase(
      mocks.workflowRepository,
      mocks.eventPublisher,
      mocks.workflowRunActiveChecker,
    );
    await expect(useCase.execute({ workflowId: 'nonexistent' as WorkflowId })).rejects.toThrow(WorkflowNotFoundForDeletionError);
  });

  it('throws WorkflowHasActiveRunsError when workflow has active runs', async () => {
    const mocks = createMocks();
    const workflow = createWorkflow();
    vi.mocked(mocks.workflowRepository.findById).mockResolvedValue(workflow);
    vi.mocked(mocks.workflowRunActiveChecker.hasActiveRuns).mockResolvedValue(true);

    const useCase = new DeleteWorkflowUseCase(
      mocks.workflowRepository,
      mocks.eventPublisher,
      mocks.workflowRunActiveChecker,
    );
    await expect(useCase.execute({ workflowId: workflow.id })).rejects.toThrow(WorkflowHasActiveRunsError);
    expect(mocks.workflowRepository.delete).not.toHaveBeenCalled();
  });
});
