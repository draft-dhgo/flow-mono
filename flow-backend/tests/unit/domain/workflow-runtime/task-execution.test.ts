import { describe, it, expect } from 'vitest';
import { TaskExecution } from '@workflow-runtime/domain/entities/task-execution.js';
import type { ReportId } from '@workflow-runtime/domain/value-objects/index.js';

describe('TaskExecution', () => {
  it('creates with initial state', () => {
    const task = TaskExecution.create({ order: 0, query: 'Test query' });
    expect(task.order).toBe(0);
    expect(task.query).toBe('Test query');
    expect(task.isTerminal).toBe(false);
    expect(task.reportId).toBeNull();
  });

  it('creates with reportId', () => {
    const reportId = 'report-001' as ReportId;
    const task = TaskExecution.create({ order: 0, query: 'Test', reportId });
    expect(task.requiresReport()).toBe(true);
    expect(task.reportId).toBe(reportId);
  });

  it('markCompleted makes terminal', () => {
    const task = TaskExecution.create({ order: 0, query: 'Test' });
    task.markCompleted();
    expect(task.isTerminal).toBe(true);
  });

  it('markFailed makes terminal', () => {
    const task = TaskExecution.create({ order: 0, query: 'Test' });
    task.markFailed();
    expect(task.isTerminal).toBe(true);
  });

  it('cancel makes terminal', () => {
    const task = TaskExecution.create({ order: 0, query: 'Test' });
    task.cancel();
    expect(task.isTerminal).toBe(true);
  });

  it('reset clears all flags', () => {
    const task = TaskExecution.create({ order: 0, query: 'Test' });
    task.markCompleted();
    task.reset();
    expect(task.isTerminal).toBe(false);
  });

  it('requiresReport returns false without reportId', () => {
    const task = TaskExecution.create({ order: 0, query: 'Test' });
    expect(task.requiresReport()).toBe(false);
  });
});
