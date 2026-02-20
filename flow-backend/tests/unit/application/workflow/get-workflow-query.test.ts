import { describe, it, expect, vi } from 'vitest';
import { GetWorkflowQuery } from '@workflow/application/queries/get-workflow-query.js';
import { Workflow } from '@workflow/domain/entities/workflow.js';
import {
  WorkflowStatus, BranchStrategy, WorkDefinition, TaskDefinition,
  AgentModel, GitRef, McpServerRef,
} from '@workflow/domain/value-objects/index.js';
import type { WorkflowRepository } from '@workflow/domain/ports/workflow-repository.js';
import type { WorkflowId, GitId, McpServerId } from '@common/ids/index.js';
import { ApplicationError } from '@common/errors/index.js';
import { BranchName } from '@workflow/domain/value-objects/branch-name.js';

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
  return { workflowRepository };
}

const WORKFLOW_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as WorkflowId;
const GIT_ID = 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee' as GitId;
const MCP_ID = 'cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee' as McpServerId;

function makeWorkflow(): Workflow {
  const task = TaskDefinition.create(0, 'Do something');
  const model = AgentModel.create('claude-sonnet-4-5-20250929');
  const gitRef = GitRef.fromProps(GIT_ID, BranchName.create('main'), true);
  const mcpRef = McpServerRef.fromProps(MCP_ID, {}, true);
  const workDef = WorkDefinition.fromProps(0, model, [task], [gitRef], [mcpRef], false);

  return Workflow.fromProps({
    id: WORKFLOW_ID,
    name: 'Test Workflow',
    description: 'A test workflow',
    branchStrategy: BranchStrategy.create('feature'),
    gitRefs: [gitRef],
    mcpServerRefs: [mcpRef],
    seedKeys: ['ISSUE_KEY'],
    workDefinitions: [workDef],
    status: WorkflowStatus.DRAFT,
  });
}

describe('GetWorkflowQuery', () => {
  it('returns workflow read model when found', async () => {
    const mocks = createMocks();
    const workflow = makeWorkflow();
    vi.mocked(mocks.workflowRepository.findById).mockResolvedValue(workflow);

    const query = new GetWorkflowQuery(mocks.workflowRepository);
    const result = await query.execute({ workflowId: WORKFLOW_ID });

    expect(result.id).toBe(WORKFLOW_ID);
    expect(result.name).toBe('Test Workflow');
    expect(result.description).toBe('A test workflow');
    expect(result.branchStrategy).toBe('feature');
    expect(result.status).toBe(WorkflowStatus.DRAFT);
    expect(result.gitRefCount).toBe(1);
    expect(result.mcpServerRefCount).toBe(1);
    expect(result.workDefinitionCount).toBe(1);
    expect(result.seedKeys).toEqual(['ISSUE_KEY']);
    expect(result.gitRefs).toHaveLength(1);
    expect(result.gitRefs[0]!.gitId).toBe(GIT_ID);
    expect(result.mcpServerRefs).toHaveLength(1);
    expect(result.mcpServerRefs[0]!.mcpServerId).toBe(MCP_ID);
    expect(result.workDefinitions).toHaveLength(1);
    expect(result.workDefinitions[0]!.order).toBe(0);
    expect(result.workDefinitions[0]!.taskDefinitions).toHaveLength(1);
    expect(mocks.workflowRepository.findById).toHaveBeenCalledWith(WORKFLOW_ID);
  });

  it('throws ApplicationError when workflow not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRepository.findById).mockResolvedValue(null);

    const query = new GetWorkflowQuery(mocks.workflowRepository);

    await expect(query.execute({ workflowId: WORKFLOW_ID })).rejects.toThrow(ApplicationError);
    await expect(query.execute({ workflowId: WORKFLOW_ID })).rejects.toThrow(/not found/i);
  });
});
