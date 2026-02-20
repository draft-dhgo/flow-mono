import { describe, it, expect, vi } from 'vitest';
import {
  CreateWorkflowUseCase,
  GitReferenceNotFoundError,
} from '@workflow/application/commands/create-workflow-use-case.js';
import { WorkDefinition, TaskDefinition, GitRef, AgentModel } from '@workflow/domain/index.js';
import type { WorkflowRepository } from '@workflow/domain/ports/workflow-repository.js';
import type { EventPublisher, GitReferenceChecker, McpServerReferenceChecker } from '@common/ports/index.js';
import type { GitId } from '@common/ids/index.js';

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

const GIT_ID = 'git-001' as GitId;

function makeValidCommand() {
  const task = TaskDefinition.create(0, 'Do something');
  const model = AgentModel.create('claude-sonnet-4-5-20250929');
  const workDef = WorkDefinition.create(0, model, [task]);
  const gitRef = GitRef.create(GIT_ID, 'main');
  return {
    name: 'Test Workflow',
    branchStrategy: 'feature',
    workDefinitions: [workDef],
    gitRefs: [gitRef],
  };
}

describe('CreateWorkflowUseCase', () => {
  it('creates workflow and publishes events', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.gitReferenceChecker.findByIds).mockResolvedValue([{ id: GIT_ID }]);

    const useCase = new CreateWorkflowUseCase(
      mocks.workflowRepository,
      mocks.gitReferenceChecker,
      mocks.mcpServerReferenceChecker,
      mocks.eventPublisher,
    );

    const result = await useCase.execute(makeValidCommand());

    expect(result.workflowId).toBeDefined();
    expect(result.name).toBe('Test Workflow');
    expect(mocks.workflowRepository.save).toHaveBeenCalledOnce();
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalledOnce();
  });

  it('throws when git reference not found', async () => {
    const mocks = createMocks();
    // findByIds returns empty — git ref not found
    vi.mocked(mocks.gitReferenceChecker.findByIds).mockResolvedValue([]);

    const useCase = new CreateWorkflowUseCase(
      mocks.workflowRepository,
      mocks.gitReferenceChecker,
      mocks.mcpServerReferenceChecker,
      mocks.eventPublisher,
    );

    await expect(useCase.execute(makeValidCommand())).rejects.toThrow(GitReferenceNotFoundError);
    expect(mocks.workflowRepository.save).not.toHaveBeenCalled();
  });
});
