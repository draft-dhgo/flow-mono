import { describe, it, expect, vi } from 'vitest';
import { ListWorkflowRunsQuery } from '@workflow-runtime/application/queries/list-workflow-runs-query.js';
import { WorkflowRun } from '@workflow-runtime/domain/entities/workflow-run.js';
import {
  WorkflowRunId, WorkflowRunStatus, WorkNodeConfig, TaskNodeConfig,
} from '@workflow-runtime/domain/value-objects/index.js';
import type { WorkflowRunRepository } from '@workflow-runtime/domain/ports/workflow-run-repository.js';
import type { WorkflowConfigReader, WorkflowConfig } from '@common/ports/index.js';
import type { WorkflowId } from '@common/ids/index.js';

function createMocks() {
  const workflowRunRepository: WorkflowRunRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByWorkflowId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  const workflowConfigReader: WorkflowConfigReader = {
    findById: vi.fn(),
  };
  return { workflowRunRepository, workflowConfigReader };
}

const WORKFLOW_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as WorkflowId;
const RUN_ID_1 = WorkflowRunId.generate();
const RUN_ID_2 = WorkflowRunId.generate();

function makeWorkflowRun(runId: WorkflowRunId): WorkflowRun {
  const taskConfig = TaskNodeConfig.create(0, 'Do something');
  const workNodeConfig = WorkNodeConfig.create({
    sequence: 0,
    model: 'claude-sonnet-4-5-20250929',
    taskConfigs: [taskConfig],
  });

  return WorkflowRun.fromProps({
    id: runId,
    workflowId: WORKFLOW_ID,
    issueKey: 'FLOW-001',
    seedValues: {},
    status: WorkflowRunStatus.INITIALIZED,
    currentWorkIndex: 0,
    cancelledAtWorkIndex: null,
    cancellationReason: null,
    workExecutionIds: [],
    gitRefPool: [],
    mcpServerRefPool: [],
    workNodeConfigs: [workNodeConfig],
    restoredToCheckpoint: false,
  });
}

function makeWorkflowConfig(): WorkflowConfig {
  return {
    id: WORKFLOW_ID,
    name: 'Test Workflow',
    status: 'DRAFT',
    branchStrategy: 'feature',
    gitRefs: [],
    mcpServerRefs: [],
    seedKeys: [],
    workDefinitions: [],
  };
}

describe('ListWorkflowRunsQuery', () => {
  it('returns list of workflow run read models with workflow names', async () => {
    const mocks = createMocks();
    const runs = [makeWorkflowRun(RUN_ID_1), makeWorkflowRun(RUN_ID_2)];
    vi.mocked(mocks.workflowRunRepository.findAll).mockResolvedValue(runs);
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(makeWorkflowConfig());

    const query = new ListWorkflowRunsQuery(mocks.workflowRunRepository, mocks.workflowConfigReader);
    const result = await query.execute();

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe(RUN_ID_1);
    expect(result[0]!.workflowName).toBe('Test Workflow');
    expect(result[1]!.id).toBe(RUN_ID_2);
    expect(mocks.workflowRunRepository.findAll).toHaveBeenCalledOnce();
  });

  it('returns empty workflowName when workflow config not found', async () => {
    const mocks = createMocks();
    const runs = [makeWorkflowRun(RUN_ID_1)];
    vi.mocked(mocks.workflowRunRepository.findAll).mockResolvedValue(runs);
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(null);

    const query = new ListWorkflowRunsQuery(mocks.workflowRunRepository, mocks.workflowConfigReader);
    const result = await query.execute();

    expect(result).toHaveLength(1);
    expect(result[0]!.workflowName).toBe('');
  });

  it('returns empty array when no runs exist', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRunRepository.findAll).mockResolvedValue([]);

    const query = new ListWorkflowRunsQuery(mocks.workflowRunRepository, mocks.workflowConfigReader);
    const result = await query.execute();

    expect(result).toEqual([]);
  });
});
