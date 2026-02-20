import { describe, it, expect } from 'vitest';
import { WorkflowRunFactory } from '@workflow-runtime/application/factories/workflow-run-factory.js';
import { WorkflowRunStatus } from '@workflow-runtime/domain/value-objects/index.js';
import type { WorkflowConfig } from '@common/ports/index.js';
import type { WorkflowId } from '@common/ids/index.js';

const WF_ID = 'wf-test-001' as WorkflowId;

function makeConfig(opts?: { withReport?: boolean; taskCount?: number; workCount?: number }): WorkflowConfig {
  const taskCount = opts?.taskCount ?? 2;
  const workCount = opts?.workCount ?? 1;

  const workDefinitions = Array.from({ length: workCount }, (_, wi) => ({
    order: wi,
    model: 'claude-sonnet',
    pauseAfter: false,
    taskDefinitions: Array.from({ length: taskCount }, (_, ti) => ({
      order: ti,
      query: `Task ${wi}-${ti}`,
      reportOutline: opts?.withReport && ti === 0
        ? { sections: [{ title: 'Summary', description: 'Summary section' }] }
        : undefined,
    })),
    mcpServerRefs: [],
    gitRefs: [],
  }));

  return {
    id: WF_ID,
    name: 'Test Workflow',
    status: 'ACTIVE',
    branchStrategy: 'feature/{issueKey}',
    gitRefs: [],
    mcpServerRefs: [],
    workDefinitions,
  };
}

describe('WorkflowRunFactory', () => {
  const factory = new WorkflowRunFactory();

  it('builds WorkflowRun with correct initial state', () => {
    const result = factory.build(makeConfig(), 'TEST-001');

    expect(result.run.status).toBe(WorkflowRunStatus.INITIALIZED);
    expect(result.run.workflowId).toBe(WF_ID);
  });

  it('creates correct number of WorkNodeConfigs', () => {
    const result = factory.build(makeConfig({ workCount: 3 }), 'TEST-001');

    expect(result.run.workNodeConfigs).toHaveLength(3);
    expect(result.run.workNodeConfigs[0].sequence).toBe(0);
    expect(result.run.workNodeConfigs[1].sequence).toBe(1);
    expect(result.run.workNodeConfigs[2].sequence).toBe(2);
  });

  it('creates TaskNodeConfigs inside each WorkNodeConfig', () => {
    const result = factory.build(makeConfig({ taskCount: 3 }), 'TEST-001');

    expect(result.run.workNodeConfigs[0].taskConfigs).toHaveLength(3);
    expect(result.run.workNodeConfigs[0].taskConfigs[0].query).toBe('Task 0-0');
  });

  it('stores reportOutline in TaskNodeConfig when provided', () => {
    const result = factory.build(makeConfig({ withReport: true }), 'TEST-001');

    const taskConfigs = result.run.workNodeConfigs[0].taskConfigs;
    expect(taskConfigs[0].requiresReport()).toBe(true);
    expect(taskConfigs[0].reportOutline).not.toBeNull();
  });

  it('does not store reportOutline when not provided', () => {
    const result = factory.build(makeConfig({ withReport: false }), 'TEST-001');

    const taskConfigs = result.run.workNodeConfigs[0].taskConfigs;
    for (const tc of taskConfigs) {
      expect(tc.requiresReport()).toBe(false);
    }
  });

  it('preserves model in WorkNodeConfig', () => {
    const result = factory.build(makeConfig(), 'TEST-001');

    expect(result.run.workNodeConfigs[0].model).toBe('claude-sonnet');
  });

  it('creates multiple WorkNodeConfigs with correct task distribution', () => {
    const result = factory.build(makeConfig({ workCount: 2, taskCount: 2 }), 'TEST-001');

    expect(result.run.workNodeConfigs).toHaveLength(2);
    expect(result.run.workNodeConfigs[0].taskConfigs[0].query).toBe('Task 0-0');
    expect(result.run.workNodeConfigs[1].taskConfigs[0].query).toBe('Task 1-0');
  });

  it('sets totalWorkCount from workNodeConfigs', () => {
    const result = factory.build(makeConfig({ workCount: 3 }), 'TEST-001');

    expect(result.run.totalWorkCount).toBe(3);
  });
});
