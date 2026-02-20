import { describe, it, expect, vi } from 'vitest';
import { ListWorkflowsQuery } from '@workflow/application/queries/list-workflows-query.js';
import { Workflow } from '@workflow/domain/entities/workflow.js';
import {
  WorkflowStatus, BranchStrategy, WorkDefinition, TaskDefinition, AgentModel,
} from '@workflow/domain/value-objects/index.js';
import type { WorkflowRepository } from '@workflow/domain/ports/workflow-repository.js';
import type { WorkflowId } from '@common/ids/index.js';

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

const WORKFLOW_ID_1 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as WorkflowId;
const WORKFLOW_ID_2 = 'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff' as WorkflowId;

function makeWorkflow(id: WorkflowId, name: string): Workflow {
  const task = TaskDefinition.create(0, 'Do something');
  const model = AgentModel.create('claude-sonnet-4-5-20250929');
  const workDef = WorkDefinition.fromProps(0, model, [task], [], [], false);

  return Workflow.fromProps({
    id,
    name,
    description: '',
    branchStrategy: BranchStrategy.create('feature'),
    gitRefs: [],
    mcpServerRefs: [],
    seedKeys: [],
    workDefinitions: [workDef],
    status: WorkflowStatus.DRAFT,
  });
}

describe('ListWorkflowsQuery', () => {
  it('returns list of workflow read models', async () => {
    const mocks = createMocks();
    const workflows = [
      makeWorkflow(WORKFLOW_ID_1, 'Workflow A'),
      makeWorkflow(WORKFLOW_ID_2, 'Workflow B'),
    ];
    vi.mocked(mocks.workflowRepository.findAll).mockResolvedValue(workflows);

    const query = new ListWorkflowsQuery(mocks.workflowRepository);
    const result = await query.execute();

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe(WORKFLOW_ID_1);
    expect(result[0]!.name).toBe('Workflow A');
    expect(result[1]!.id).toBe(WORKFLOW_ID_2);
    expect(result[1]!.name).toBe('Workflow B');
    expect(mocks.workflowRepository.findAll).toHaveBeenCalledOnce();
  });

  it('returns empty array when no workflows exist', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRepository.findAll).mockResolvedValue([]);

    const query = new ListWorkflowsQuery(mocks.workflowRepository);
    const result = await query.execute();

    expect(result).toEqual([]);
  });
});
