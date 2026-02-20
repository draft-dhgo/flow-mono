import { describe, it, expect } from 'vitest';
import { WorkSpace } from '@workflow-runtime/domain/entities/work-space.js';
import { WorkExecutionId } from '@workflow-runtime/domain/value-objects/index.js';

const WE_ID = WorkExecutionId.generate();

describe('WorkSpace', () => {
  it('creates with correct properties', () => {
    const ws = WorkSpace.create({
      workExecutionId: WE_ID,
      path: '/tmp/workspace',
    });
    expect(ws.id).toBeDefined();
    expect(ws.workExecutionId).toBe(WE_ID);
    expect(ws.path).toBe('/tmp/workspace');
    expect(ws.links).toHaveLength(0);
  });

  it('fromProps restores correctly', () => {
    const ws = WorkSpace.create({
      workExecutionId: WE_ID,
      path: '/tmp/workspace',
    });
    const restored = WorkSpace.fromProps({
      id: ws.id,
      workExecutionId: WE_ID,
      path: '/tmp/workspace',
      links: [],
    });
    expect(restored.id).toBe(ws.id);
    expect(restored.links).toHaveLength(0);
  });
});
