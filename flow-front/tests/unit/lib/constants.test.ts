import { describe, it, expect } from 'vitest';
import {
  RUN_STATUS_LABEL,
  RUN_STATUS_COLOR,
  WORKFLOW_STATUS_LABEL,
  WORKFLOW_STATUS_COLOR,
  MODEL_OPTIONS,
} from '@/lib/constants';
import type { WorkflowRunStatus, WorkflowStatus } from '@/api/types';

describe('RUN_STATUS_LABEL', () => {
  const allRunStatuses: WorkflowRunStatus[] = [
    'INITIALIZED',
    'RUNNING',
    'PAUSED',
    'AWAITING',
    'COMPLETED',
    'CANCELLED',
  ];

  it.each(allRunStatuses)('has label for %s', (status) => {
    expect(RUN_STATUS_LABEL[status]).toBeTruthy();
    expect(typeof RUN_STATUS_LABEL[status]).toBe('string');
  });

  it('covers all WorkflowRunStatus values', () => {
    expect(Object.keys(RUN_STATUS_LABEL)).toHaveLength(allRunStatuses.length);
  });
});

describe('RUN_STATUS_COLOR', () => {
  it('has colors for all run statuses', () => {
    const statuses: WorkflowRunStatus[] = [
      'INITIALIZED',
      'RUNNING',
      'PAUSED',
      'AWAITING',
      'COMPLETED',
      'CANCELLED',
    ];
    for (const status of statuses) {
      expect(RUN_STATUS_COLOR[status]).toBeTruthy();
    }
  });
});

describe('WORKFLOW_STATUS_LABEL', () => {
  const allWorkflowStatuses: WorkflowStatus[] = ['DRAFT', 'ACTIVE'];

  it.each(allWorkflowStatuses)('has label for %s', (status) => {
    expect(WORKFLOW_STATUS_LABEL[status]).toBeTruthy();
    expect(typeof WORKFLOW_STATUS_LABEL[status]).toBe('string');
  });

  it('covers all WorkflowStatus values', () => {
    expect(Object.keys(WORKFLOW_STATUS_LABEL)).toHaveLength(allWorkflowStatuses.length);
  });
});

describe('WORKFLOW_STATUS_COLOR', () => {
  it('has colors for all workflow statuses', () => {
    const statuses: WorkflowStatus[] = ['DRAFT', 'ACTIVE'];
    for (const status of statuses) {
      expect(WORKFLOW_STATUS_COLOR[status]).toBeTruthy();
    }
  });
});

describe('MODEL_OPTIONS', () => {
  it('is not empty', () => {
    expect(MODEL_OPTIONS.length).toBeGreaterThan(0);
  });

  it('each option has value and label', () => {
    for (const option of MODEL_OPTIONS) {
      expect(option.value).toBeTruthy();
      expect(option.label).toBeTruthy();
    }
  });
});
