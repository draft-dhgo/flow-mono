import { describe, it, expect } from 'vitest';
import { WorkflowRun } from '@workflow-runtime/domain/entities/workflow-run.js';
import { WorkflowRunStatus, WorkExecutionId, WorkNodeConfig, TaskNodeConfig } from '@workflow-runtime/domain/value-objects/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import type { WorkflowRunCancelled } from '@common/events/index.js';

const WORKFLOW_ID = 'wf-test-001' as WorkflowId;

function makeWorkNodeConfig(sequence: number): WorkNodeConfig {
  return WorkNodeConfig.create({
    sequence,
    model: 'claude-sonnet',
    taskConfigs: [TaskNodeConfig.create(0, 'test query')],
  });
}

function createRun(weCount = 3): WorkflowRun {
  const configs = Array.from({ length: weCount }, (_, i) => makeWorkNodeConfig(i));
  const run = WorkflowRun.create({
    workflowId: WORKFLOW_ID,
    issueKey: 'TEST-001',
    gitRefPool: [],
    mcpServerRefPool: [],
    workNodeConfigs: configs,
  });
  for (let i = 0; i < weCount; i++) {
    run.addWorkExecution(`we-${i}` as WorkExecutionId);
  }
  return run;
}

describe('WorkflowRun', () => {
  // ===== Creation =====
  it('creates in INITIALIZED status', () => {
    const run = WorkflowRun.create({
      workflowId: WORKFLOW_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [makeWorkNodeConfig(0)],
    });
    expect(run.status).toBe(WorkflowRunStatus.INITIALIZED);
    expect(run.currentWorkIndex).toBe(0);
    expect(run.cancellationReason).toBeNull();
    expect(run.cancelledAtWorkIndex).toBeNull();
  });

  it('emits WorkflowRunCreated on create', () => {
    const run = WorkflowRun.create({
      workflowId: WORKFLOW_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [makeWorkNodeConfig(0)],
    });
    const events = run.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('workflow-run.created');
  });

  // ===== State transitions: INITIALIZED → RUNNING =====
  it('start: INITIALIZED → RUNNING', () => {
    const run = createRun();
    run.start();
    expect(run.status).toBe(WorkflowRunStatus.RUNNING);
    expect(run.currentWorkIndex).toBe(0);
  });

  it('start: throws if not INITIALIZED', () => {
    const run = createRun();
    run.start();
    expect(() => run.start()).toThrow();
  });

  // ===== State transitions: RUNNING → PAUSED =====
  it('pause: RUNNING → PAUSED', () => {
    const run = createRun();
    run.start();
    run.pause();
    expect(run.status).toBe(WorkflowRunStatus.PAUSED);
    expect(run.currentWorkIndex).toBe(0); // preserved
  });

  it('pause: throws if not RUNNING', () => {
    const run = createRun();
    expect(() => run.pause()).toThrow();
  });

  // ===== State transitions: PAUSED → RUNNING =====
  it('resume: PAUSED → RUNNING', () => {
    const run = createRun();
    run.start();
    run.pause();
    run.resume();
    expect(run.status).toBe(WorkflowRunStatus.RUNNING);
  });

  it('resume: throws if not PAUSED or AWAITING', () => {
    const run = createRun();
    run.start();
    expect(() => run.resume()).toThrow();
  });

  // ===== State transitions: RUNNING → AWAITING =====
  it('await: RUNNING → AWAITING', () => {
    const run = createRun();
    run.start();
    run.await();
    expect(run.status).toBe(WorkflowRunStatus.AWAITING);
  });

  it('await: throws if not RUNNING', () => {
    const run = createRun();
    expect(() => run.await()).toThrow();
  });

  it('await: emits WorkflowRunAwaiting event', () => {
    const run = createRun();
    run.clearDomainEvents();
    run.start();
    run.await();
    const events = run.clearDomainEvents();
    expect(events).toHaveLength(2);
    expect(events[1].eventType).toBe('workflow-run.awaiting');
  });

  // ===== State transitions: AWAITING → RUNNING =====
  it('resume: AWAITING → RUNNING', () => {
    const run = createRun();
    run.start();
    run.await();
    run.resume();
    expect(run.status).toBe(WorkflowRunStatus.RUNNING);
  });

  it('canResume: true for PAUSED', () => {
    const run = createRun();
    run.start();
    run.pause();
    expect(run.canResume()).toBe(true);
  });

  it('canResume: true for AWAITING', () => {
    const run = createRun();
    run.start();
    run.await();
    expect(run.canResume()).toBe(true);
  });

  it('canResume: false for RUNNING', () => {
    const run = createRun();
    run.start();
    expect(run.canResume()).toBe(false);
  });

  // ===== cancel from AWAITING =====
  it('cancel from AWAITING', () => {
    const run = createRun();
    run.start();
    run.await();
    run.cancel();
    expect(run.status).toBe(WorkflowRunStatus.CANCELLED);
  });

  // ===== advanceWork =====
  it('advanceWork advances currentWorkIndex', () => {
    const run = createRun(3);
    run.start();
    const hasNext = run.advanceWork();
    expect(hasNext).toBe(true);
    expect(run.currentWorkIndex).toBe(1);
    expect(run.status).toBe(WorkflowRunStatus.RUNNING);
  });

  it('advanceWork completes when last work is done', () => {
    const run = createRun(2);
    run.start();
    run.advanceWork(); // index 0 → 1
    const hasNext = run.advanceWork(); // index 1 → 2 (beyond length)
    expect(hasNext).toBe(false);
    expect(run.status).toBe(WorkflowRunStatus.COMPLETED);
  });

  it('advanceWork throws if not RUNNING', () => {
    const run = createRun();
    expect(() => run.advanceWork()).toThrow();
  });

  // ===== cancel =====
  it('cancel: any non-terminal → CANCELLED', () => {
    const run = createRun();
    run.start();
    run.cancel('agent crashed');
    expect(run.status).toBe(WorkflowRunStatus.CANCELLED);
    expect(run.cancellationReason).toBe('agent crashed');
    expect(run.cancelledAtWorkIndex).toBe(0);
  });

  it('cancel from PAUSED', () => {
    const run = createRun();
    run.start();
    run.pause();
    run.cancel();
    expect(run.status).toBe(WorkflowRunStatus.CANCELLED);
  });

  it('cancel from INITIALIZED', () => {
    const run = createRun();
    run.cancel('user cancelled');
    expect(run.status).toBe(WorkflowRunStatus.CANCELLED);
  });

  it('cancel throws if already terminal', () => {
    const run = createRun(1);
    run.start();
    run.advanceWork(); // COMPLETED
    expect(() => run.cancel()).toThrow();
  });

  // ===== isTerminal =====
  it('isTerminal returns true for COMPLETED', () => {
    const run = createRun(1);
    run.start();
    run.advanceWork();
    expect(run.isTerminal()).toBe(true);
  });

  it('isTerminal returns true for CANCELLED', () => {
    const run = createRun();
    run.cancel();
    expect(run.isTerminal()).toBe(true);
  });

  it('isTerminal returns false for non-terminal', () => {
    const run = createRun();
    expect(run.isTerminal()).toBe(false);
    run.start();
    expect(run.isTerminal()).toBe(false);
  });

  // ===== currentWorkExecutionId =====
  it('currentWorkExecutionId returns correct id', () => {
    const run = createRun(3);
    run.start();
    expect(run.currentWorkExecutionId).toBe('we-0');
    run.advanceWork();
    expect(run.currentWorkExecutionId).toBe('we-1');
  });

  // ===== restoreToCheckpoint =====
  it('restoreToCheckpoint sets currentWorkIndex', () => {
    const run = createRun(5);
    run.start();
    run.advanceWork(); // 0→1
    run.advanceWork(); // 1→2
    run.pause();
    run.restoreToCheckpoint(1);
    expect(run.currentWorkIndex).toBe(1);
    expect(run.status).toBe(WorkflowRunStatus.PAUSED);
  });

  it('restoreToCheckpoint works from AWAITING', () => {
    const run = createRun(5);
    run.start();
    run.advanceWork(); // 0→1
    run.await();
    run.restoreToCheckpoint(1);
    expect(run.currentWorkIndex).toBe(1);
    expect(run.status).toBe(WorkflowRunStatus.PAUSED);
  });

  it('restoreToCheckpoint throws if RUNNING', () => {
    const run = createRun(3);
    run.start();
    expect(() => run.restoreToCheckpoint(0)).toThrow();
  });

  it('restoreToCheckpoint throws on invalid sequence', () => {
    const run = createRun(3);
    run.start();
    run.pause();
    expect(() => run.restoreToCheckpoint(-1)).toThrow();
    expect(() => run.restoreToCheckpoint(3)).toThrow();
  });

  // ===== addWorkExecution =====
  it('addWorkExecution rejects duplicates', () => {
    const run = WorkflowRun.create({
      workflowId: WORKFLOW_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [makeWorkNodeConfig(0)],
    });
    run.addWorkExecution('we-1' as WorkExecutionId);
    expect(() => run.addWorkExecution('we-1' as WorkExecutionId)).toThrow();
  });

  // ===== Events emitted =====
  it('emits correct events through lifecycle', () => {
    const run = createRun(1);
    run.clearDomainEvents(); // clear Created event
    run.start();
    run.advanceWork(); // COMPLETED
    const events = run.clearDomainEvents();
    expect(events).toHaveLength(2);
    expect(events[0].eventType).toBe('workflow-run.started');
    expect(events[1].eventType).toBe('workflow-run.completed');
  });

  it('cancel event includes reason', () => {
    const run = createRun();
    run.clearDomainEvents();
    run.cancel('test reason');
    const events = run.clearDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('workflow-run.cancelled');
    expect((events[0] as WorkflowRunCancelled).payload.reason).toBe('test reason');
  });

  // ===== canEditWorkNode during RUNNING =====
  it('canEditWorkNode: true for future nodes during RUNNING', () => {
    const run = createRun(3);
    run.start(); // RUNNING, currentWorkIndex = 0
    expect(run.canEditWorkNode(1)).toBe(true);
    expect(run.canEditWorkNode(2)).toBe(true);
  });

  it('canEditWorkNode: false for current node during RUNNING', () => {
    const run = createRun(3);
    run.start();
    expect(run.canEditWorkNode(0)).toBe(false);
  });

  it('canEditWorkNode: respects advanceWork during RUNNING', () => {
    const run = createRun(3);
    run.start();
    run.advanceWork(); // currentWorkIndex = 1
    expect(run.canEditWorkNode(0)).toBe(false);
    expect(run.canEditWorkNode(1)).toBe(false);
    expect(run.canEditWorkNode(2)).toBe(true);
  });

  it('editableFromSequence returns currentWorkIndex+1 for RUNNING', () => {
    const run = createRun(3);
    run.start();
    expect(run.editableFromSequence()).toBe(1);
    run.advanceWork();
    expect(run.editableFromSequence()).toBe(2);
  });
});
