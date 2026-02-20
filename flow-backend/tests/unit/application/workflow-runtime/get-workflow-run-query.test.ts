import { describe, it, expect, vi } from 'vitest';
import { GetWorkflowRunQuery } from '@workflow-runtime/application/queries/get-workflow-run-query.js';
import { WorkflowRun } from '@workflow-runtime/domain/entities/workflow-run.js';
import {
  WorkflowRunId, WorkflowRunStatus, WorkNodeConfig, TaskNodeConfig,
  GitRefNodeConfig, McpServerRefNodeConfig,
} from '@workflow-runtime/domain/value-objects/index.js';
import type { WorkflowRunRepository } from '@workflow-runtime/domain/ports/workflow-run-repository.js';
import type { WorkflowConfigReader, WorkflowConfig } from '@common/ports/index.js';
import type { WorkflowId, GitId, McpServerId } from '@common/ids/index.js';
import { NotFoundException } from '@nestjs/common';

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
const GIT_ID = 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee' as GitId;
const MCP_ID = 'cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee' as McpServerId;
const RUN_ID = WorkflowRunId.generate();

function makeWorkflowRun(): WorkflowRun {
  const taskConfig = TaskNodeConfig.create(0, 'Do something');
  const gitRefConfig = GitRefNodeConfig.create(GIT_ID, 'main');
  const mcpRefConfig = McpServerRefNodeConfig.create(MCP_ID, {});
  const workNodeConfig = WorkNodeConfig.create({
    sequence: 0,
    model: 'claude-sonnet-4-5-20250929',
    taskConfigs: [taskConfig],
    gitRefConfigs: [gitRefConfig],
    mcpServerRefConfigs: [mcpRefConfig],
    pauseAfter: false,
  });

  return WorkflowRun.fromProps({
    id: RUN_ID,
    workflowId: WORKFLOW_ID,
    issueKey: 'FLOW-123',
    seedValues: { ISSUE_KEY: 'FLOW-123' },
    status: WorkflowRunStatus.INITIALIZED,
    currentWorkIndex: 0,
    cancelledAtWorkIndex: null,
    cancellationReason: null,
    workExecutionIds: [],
    gitRefPool: [gitRefConfig],
    mcpServerRefPool: [mcpRefConfig],
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
    gitRefs: [{ gitId: GIT_ID, baseBranch: 'main' }],
    mcpServerRefs: [{ mcpServerId: MCP_ID, envOverrides: {} }],
    seedKeys: ['ISSUE_KEY'],
    workDefinitions: [],
  };
}

describe('GetWorkflowRunQuery', () => {
  it('returns workflow run with seedKeys when found', async () => {
    const mocks = createMocks();
    const run = makeWorkflowRun();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(makeWorkflowConfig());

    const query = new GetWorkflowRunQuery(mocks.workflowRunRepository, mocks.workflowConfigReader);
    const result = await query.execute({ workflowRunId: RUN_ID });

    expect(result.id).toBe(RUN_ID);
    expect(result.workflowId).toBe(WORKFLOW_ID);
    expect(result.issueKey).toBe('FLOW-123');
    expect(result.status).toBe(WorkflowRunStatus.INITIALIZED);
    expect(result.seedKeys).toEqual(['ISSUE_KEY']);
    expect(result.workNodeConfigs).toHaveLength(1);
    expect(mocks.workflowRunRepository.findById).toHaveBeenCalledWith(RUN_ID);
  });

  it('returns empty seedKeys when workflow config not found', async () => {
    const mocks = createMocks();
    const run = makeWorkflowRun();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);
    vi.mocked(mocks.workflowConfigReader.findById).mockResolvedValue(null);

    const query = new GetWorkflowRunQuery(mocks.workflowRunRepository, mocks.workflowConfigReader);
    const result = await query.execute({ workflowRunId: RUN_ID });

    expect(result.id).toBe(RUN_ID);
    expect(result.seedKeys).toEqual([]);
  });

  it('throws NotFoundException when workflow run not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(null);

    const query = new GetWorkflowRunQuery(mocks.workflowRunRepository, mocks.workflowConfigReader);

    await expect(query.execute({ workflowRunId: RUN_ID })).rejects.toThrow(NotFoundException);
  });
});
