import { describe, it, expect } from 'vitest';
import { WorkExecution } from '@workflow-runtime/domain/entities/work-execution.js';
import type { WorkflowRunId } from '@workflow-runtime/domain/value-objects/index.js';
import type { WorkflowId } from '@common/ids/index.js';

const RUN_ID = 'run-test-001' as WorkflowRunId;
const WF_ID = 'wf-test-001' as WorkflowId;

function createWE(taskCount = 3): WorkExecution {
  return WorkExecution.create({
    workflowRunId: RUN_ID,
    workflowId: WF_ID,
    sequence: 0,
    model: 'claude-sonnet',
    taskProps: Array.from({ length: taskCount }, (_, i) => ({
      order: i,
      query: `Task ${i}`,
    })),
  });
}

describe('WorkExecution', () => {
  it('creates with correct initial state', () => {
    const we = createWE(2);
    expect(we.isCompleted).toBe(false);
    expect(we.isCancelled).toBe(false);
    expect(we.currentTaskIndex).toBe(0);
    expect(we.taskExecutions).toHaveLength(2);
  });

  it('emits WorkExecutionStarted on create', () => {
    const we = createWE();
    const events = we.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('work-execution.started');
  });

  it('throws if created with no tasks', () => {
    expect(() => WorkExecution.create({
      workflowRunId: RUN_ID,
      workflowId: WF_ID,
      sequence: 0,
      model: 'claude-sonnet',
      taskProps: [],
    })).toThrow();
  });

  // ===== advanceToNextTask =====
  it('advanceToNextTask advances index', () => {
    const we = createWE(3);
    const hasNext = we.advanceToNextTask();
    expect(hasNext).toBe(true);
    expect(we.currentTaskIndex).toBe(1);
    expect(we.isCompleted).toBe(false);
  });

  it('advanceToNextTask completes on last task', () => {
    const we = createWE(2);
    we.advanceToNextTask(); // 0 → 1
    const hasNext = we.advanceToNextTask(); // 1 is last
    expect(hasNext).toBe(false);
    expect(we.isCompleted).toBe(true);
  });

  it('emits WorkExecutionCompleted when all tasks done', () => {
    const we = createWE(1);
    we.clearDomainEvents();
    we.advanceToNextTask();
    const events = we.clearDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('work-execution.completed');
  });

  // ===== currentTask =====
  it('currentTask returns task at index', () => {
    const we = createWE(2);
    const task = we.currentTask();
    expect(task).not.toBeNull();
    expect(task!.order).toBe(0);
  });

  // ===== cancel =====
  it('cancel marks as cancelled', () => {
    const we = createWE();
    we.cancel();
    expect(we.isCancelled).toBe(true);
    expect(we.isTerminal).toBe(true);
  });

  it('cancel also cancels non-terminal tasks', () => {
    const we = createWE(3);
    we.cancel();
    for (const task of we.taskExecutions) {
      expect(task.isTerminal).toBe(true);
    }
  });

  // ===== reset =====
  it('reset restores state', () => {
    const we = createWE(3);
    we.advanceToNextTask();
    we.cancel();
    we.reset(0);
    expect(we.isCompleted).toBe(false);
    expect(we.isCancelled).toBe(false);
    expect(we.currentTaskIndex).toBe(0);
  });

  it('reset from specific index', () => {
    const we = createWE(3);
    we.advanceToNextTask(); // 0 → 1
    we.reset(1);
    expect(we.currentTaskIndex).toBe(1);
    // Tasks 0 should remain as-is (not reset since < fromTaskIndex)
    // Tasks 1,2 should be reset
    expect(we.taskExecutions[1].isTerminal).toBe(false);
    expect(we.taskExecutions[2].isTerminal).toBe(false);
  });

  // ===== isTerminal =====
  it('isTerminal when completed', () => {
    const we = createWE(1);
    we.advanceToNextTask();
    expect(we.isTerminal).toBe(true);
  });

  it('isTerminal when cancelled', () => {
    const we = createWE();
    we.cancel();
    expect(we.isTerminal).toBe(true);
  });

  it('not terminal when active', () => {
    const we = createWE();
    expect(we.isTerminal).toBe(false);
  });
});
