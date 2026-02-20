import { describe, it, expect } from 'vitest';
import { Checkpoint } from '@workflow-runtime/domain/entities/checkpoint.js';
import { WorkflowRunId, WorkExecutionId } from '@workflow-runtime/domain/value-objects/index.js';
import { CommitHash } from '@workflow-runtime/domain/value-objects/index.js';
import type { WorkflowId, GitId } from '@common/ids/index.js';

const WF_ID = 'wf-001' as WorkflowId;
const WR_ID = WorkflowRunId.generate();
const WE_ID = WorkExecutionId.generate();
const GIT_ID = 'git-001' as GitId;

function makeValidProps() {
  const commitHashes = new Map<GitId, CommitHash>();
  commitHashes.set(GIT_ID, CommitHash.create('a'.repeat(40)));
  return {
    workflowRunId: WR_ID,
    workflowId: WF_ID,
    workExecutionId: WE_ID,
    workSequence: 0,
    commitHashes,
  };
}

describe('Checkpoint', () => {
  it('creates with correct properties', () => {
    const checkpoint = Checkpoint.create(makeValidProps());
    expect(checkpoint.id).toBeDefined();
    expect(checkpoint.workflowRunId).toBe(WR_ID);
    expect(checkpoint.workflowId).toBe(WF_ID);
    expect(checkpoint.workExecutionId).toBe(WE_ID);
    expect(checkpoint.workSequence).toBe(0);
    expect(checkpoint.commitHashes.size).toBe(1);
    expect(checkpoint.createdAt).toBeInstanceOf(Date);
  });

  it('emits CheckpointCreated on create', () => {
    const checkpoint = Checkpoint.create(makeValidProps());
    const events = checkpoint.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('checkpoint.created');
  });

  it('throws on negative workSequence', () => {
    expect(() => Checkpoint.create({ ...makeValidProps(), workSequence: -1 })).toThrow();
  });

  it('throws on empty commitHashes', () => {
    expect(() => Checkpoint.create({
      ...makeValidProps(),
      commitHashes: new Map(),
    })).toThrow();
  });

  it('getCommitHash returns correct hash', () => {
    const checkpoint = Checkpoint.create(makeValidProps());
    const hash = checkpoint.getCommitHash(GIT_ID);
    expect(hash).toBeDefined();
  });

  it('getCommitHash returns undefined for unknown gitId', () => {
    const checkpoint = Checkpoint.create(makeValidProps());
    const hash = checkpoint.getCommitHash('git-unknown' as GitId);
    expect(hash).toBeUndefined();
  });

  it('fromProps restores without events', () => {
    const checkpoint = Checkpoint.create(makeValidProps());
    const restored = Checkpoint.fromProps({
      id: checkpoint.id,
      ...makeValidProps(),
      createdAt: new Date(),
    });
    expect(restored.getDomainEvents()).toHaveLength(0);
  });
});
