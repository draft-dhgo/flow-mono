import { describe, it, expect } from 'vitest';
import { WorkTree } from '@workflow-runtime/domain/entities/work-tree.js';
import { WorkflowRunId } from '@workflow-runtime/domain/value-objects/index.js';
import type { GitId } from '@common/ids/index.js';

const GIT_ID = 'git-001' as GitId;
const WR_ID = WorkflowRunId.generate();

describe('WorkTree', () => {
  it('creates with correct properties', () => {
    const workTree = WorkTree.create({
      gitId: GIT_ID,
      workflowRunId: WR_ID,
      path: '/tmp/worktree',
      branch: 'feature/test',
    });
    expect(workTree.id).toBeDefined();
    expect(workTree.gitId).toBe(GIT_ID);
    expect(workTree.workflowRunId).toBe(WR_ID);
    expect(workTree.path).toBe('/tmp/worktree');
    expect(workTree.branch).toBe('feature/test');
  });

  it('fromProps restores without events', () => {
    const workTree = WorkTree.create({
      gitId: GIT_ID,
      workflowRunId: WR_ID,
      path: '/tmp/worktree',
      branch: 'main',
    });
    const restored = WorkTree.fromProps({
      id: workTree.id,
      gitId: GIT_ID,
      workflowRunId: WR_ID,
      path: '/tmp/worktree',
      branch: 'main',
    });
    expect(restored.id).toBe(workTree.id);
    expect(restored.getDomainEvents()).toHaveLength(0);
  });
});
