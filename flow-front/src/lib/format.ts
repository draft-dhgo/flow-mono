import { RUN_STATUS_LABEL, WORKFLOW_STATUS_LABEL } from './constants';
import type { WorkflowRunStatus, WorkflowStatus } from '@/api/types';

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRunStatus(status: WorkflowRunStatus): string {
  return RUN_STATUS_LABEL[status] ?? status;
}

export function formatWorkflowStatus(status: WorkflowStatus): string {
  return WORKFLOW_STATUS_LABEL[status] ?? status;
}
