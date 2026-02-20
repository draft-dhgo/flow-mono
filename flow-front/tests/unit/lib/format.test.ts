import { describe, it, expect } from 'vitest';
import { formatDate, formatRunStatus, formatWorkflowStatus } from '@/lib/format';
import type { WorkflowRunStatus, WorkflowStatus } from '@/api/types';

describe('formatDate', () => {
  it('formats ISO date string in ko-KR locale', () => {
    const result = formatDate('2025-06-15T10:30:00.000Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns a string containing year, month, day', () => {
    const result = formatDate('2025-01-01T00:00:00.000Z');
    expect(result).toContain('2025');
    expect(result).toContain('01');
  });
});

describe('formatRunStatus', () => {
  const allStatuses: WorkflowRunStatus[] = [
    'INITIALIZED',
    'RUNNING',
    'PAUSED',
    'AWAITING',
    'COMPLETED',
    'CANCELLED',
  ];

  it.each(allStatuses)('returns Korean label for %s', (status) => {
    const result = formatRunStatus(status);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).not.toBe(status);
  });

  it('returns specific Korean labels', () => {
    expect(formatRunStatus('RUNNING')).toBe('실행 중');
    expect(formatRunStatus('COMPLETED')).toBe('완료');
    expect(formatRunStatus('PAUSED')).toBe('일시정지');
    expect(formatRunStatus('CANCELLED')).toBe('취소');
    expect(formatRunStatus('INITIALIZED')).toBe('초기화');
    expect(formatRunStatus('AWAITING')).toBe('대기 중');
  });
});

describe('formatWorkflowStatus', () => {
  const allStatuses: WorkflowStatus[] = ['DRAFT', 'ACTIVE'];

  it.each(allStatuses)('returns Korean label for %s', (status) => {
    const result = formatWorkflowStatus(status);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).not.toBe(status);
  });

  it('returns specific Korean labels', () => {
    expect(formatWorkflowStatus('DRAFT')).toBe('초안');
    expect(formatWorkflowStatus('ACTIVE')).toBe('활성');
  });
});
