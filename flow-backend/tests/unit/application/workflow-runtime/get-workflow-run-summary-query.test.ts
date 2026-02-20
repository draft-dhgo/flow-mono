import { describe, it, expect, vi } from 'vitest';
import { GetWorkflowRunSummaryQuery } from '@workflow-runtime/application/queries/get-workflow-run-summary-query.js';
import { WorkflowRun } from '@workflow-runtime/domain/entities/workflow-run.js';
import {
  WorkflowRunId, WorkflowRunStatus, WorkNodeConfig, TaskNodeConfig,
} from '@workflow-runtime/domain/value-objects/index.js';
import type { WorkflowRunRepository } from '@workflow-runtime/domain/ports/workflow-run-repository.js';
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
  return { workflowRunRepository };
}

const WORKFLOW_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as WorkflowId;

function makeWorkflowRun(status: WorkflowRunStatus): WorkflowRun {
  const taskConfig = TaskNodeConfig.create(0, 'Do something');
  const workNodeConfig = WorkNodeConfig.create({
    sequence: 0,
    model: 'claude-sonnet-4-5-20250929',
    taskConfigs: [taskConfig],
  });

  const run = WorkflowRun.fromProps({
    id: WorkflowRunId.generate(),
    workflowId: WORKFLOW_ID,
    issueKey: 'FLOW-001',
    seedValues: {},
    status,
    currentWorkIndex: 0,
    cancelledAtWorkIndex: status === WorkflowRunStatus.CANCELLED ? 0 : null,
    cancellationReason: status === WorkflowRunStatus.CANCELLED ? 'test' : null,
    workExecutionIds: [],
    gitRefPool: [],
    mcpServerRefPool: [],
    workNodeConfigs: [workNodeConfig],
    restoredToCheckpoint: false,
  });

  return run;
}

describe('GetWorkflowRunSummaryQuery', () => {
  it('returns correct status counts', async () => {
    const mocks = createMocks();
    const runs = [
      makeWorkflowRun(WorkflowRunStatus.INITIALIZED),
      makeWorkflowRun(WorkflowRunStatus.RUNNING),
      makeWorkflowRun(WorkflowRunStatus.RUNNING),
      makeWorkflowRun(WorkflowRunStatus.PAUSED),
      makeWorkflowRun(WorkflowRunStatus.COMPLETED),
      makeWorkflowRun(WorkflowRunStatus.COMPLETED),
      makeWorkflowRun(WorkflowRunStatus.COMPLETED),
      makeWorkflowRun(WorkflowRunStatus.CANCELLED),
    ];
    vi.mocked(mocks.workflowRunRepository.findAll).mockResolvedValue(runs);

    const query = new GetWorkflowRunSummaryQuery(mocks.workflowRunRepository);
    const result = await query.execute();

    expect(result.initialized).toBe(1);
    expect(result.running).toBe(2);
    expect(result.paused).toBe(1);
    expect(result.awaiting).toBe(0);
    expect(result.completed).toBe(3);
    expect(result.cancelled).toBe(1);
  });

  it('returns all zeros when no runs exist', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRunRepository.findAll).mockResolvedValue([]);

    const query = new GetWorkflowRunSummaryQuery(mocks.workflowRunRepository);
    const result = await query.execute();

    expect(result.initialized).toBe(0);
    expect(result.running).toBe(0);
    expect(result.paused).toBe(0);
    expect(result.awaiting).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.cancelled).toBe(0);
  });
});
