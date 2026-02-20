import { describe, it, expect } from 'vitest';
import { WorkflowSpace } from '@workflow-runtime/domain/entities/workflow-space.js';
import { WorkflowRunId } from '@workflow-runtime/domain/value-objects/index.js';

const WR_ID = WorkflowRunId.generate();

describe('WorkflowSpace', () => {
  it('creates with correct properties', () => {
    const space = WorkflowSpace.create({
      workflowRunId: WR_ID,
      path: '/tmp/workflow-space',
    });
    expect(space.id).toBeDefined();
    expect(space.workflowRunId).toBe(WR_ID);
    expect(space.path).toBe('/tmp/workflow-space');
    expect(space.workSpaces).toHaveLength(0);
  });

  it('fromProps restores with workSpaces', () => {
    const space = WorkflowSpace.create({
      workflowRunId: WR_ID,
      path: '/tmp/workflow-space',
    });
    const restored = WorkflowSpace.fromProps({
      id: space.id,
      workflowRunId: WR_ID,
      path: '/tmp/workflow-space',
      workSpaces: [],
    });
    expect(restored.id).toBe(space.id);
    expect(restored.workSpaces).toHaveLength(0);
  });
});
