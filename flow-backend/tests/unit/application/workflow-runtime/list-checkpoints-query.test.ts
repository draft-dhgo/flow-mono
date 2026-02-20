import { describe, it, expect, vi } from 'vitest';
import { ListCheckpointsQuery } from '@workflow-runtime/application/queries/list-checkpoints-query.js';
import { Checkpoint } from '@workflow-runtime/domain/entities/checkpoint.js';
import {
  WorkflowRunId, WorkExecutionId, CheckpointId,
} from '@workflow-runtime/domain/value-objects/index.js';
import type { CheckpointRepository } from '@workflow-runtime/domain/ports/checkpoint-repository.js';
import type { WorkflowId, GitId } from '@common/ids/index.js';
import type { CommitHash } from '@workflow-runtime/domain/value-objects/index.js';

function createMocks() {
  const checkpointRepository: CheckpointRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  return { checkpointRepository };
}

const RUN_ID = WorkflowRunId.generate();
const WORKFLOW_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as WorkflowId;
const WE_ID = WorkExecutionId.generate();
const GIT_ID = 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee' as GitId;

function makeCheckpoint(workSequence: number): Checkpoint {
  const commitHashes = new Map<GitId, CommitHash>([[GIT_ID, 'abc123' as CommitHash]]);
  return Checkpoint.fromProps({
    id: CheckpointId.generate(),
    workflowRunId: RUN_ID,
    workflowId: WORKFLOW_ID,
    workExecutionId: WE_ID,
    workSequence,
    commitHashes,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  });
}

describe('ListCheckpointsQuery', () => {
  it('returns list of checkpoint read models', async () => {
    const mocks = createMocks();
    const checkpoints = [makeCheckpoint(0), makeCheckpoint(1)];
    vi.mocked(mocks.checkpointRepository.findByWorkflowRunId).mockResolvedValue(checkpoints);

    const query = new ListCheckpointsQuery(mocks.checkpointRepository);
    const result = await query.execute({ workflowRunId: RUN_ID });

    expect(result).toHaveLength(2);
    expect(result[0]!.workflowRunId).toBe(RUN_ID);
    expect(result[0]!.workflowId).toBe(WORKFLOW_ID);
    expect(result[0]!.workSequence).toBe(0);
    expect(result[0]!.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(result[1]!.workSequence).toBe(1);
    expect(mocks.checkpointRepository.findByWorkflowRunId).toHaveBeenCalledWith(RUN_ID);
  });

  it('returns empty array when no checkpoints exist', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.checkpointRepository.findByWorkflowRunId).mockResolvedValue([]);

    const query = new ListCheckpointsQuery(mocks.checkpointRepository);
    const result = await query.execute({ workflowRunId: RUN_ID });

    expect(result).toEqual([]);
  });
});
