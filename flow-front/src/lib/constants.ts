import type { WorkflowRunStatus, WorkflowStatus, WorkspaceStatus } from '@/api/types';

export const RUN_STATUS_COLOR: Record<WorkflowRunStatus, string> = {
  INITIALIZED: 'bg-gray-100 text-gray-800',
  RUNNING: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  AWAITING: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export const WORKFLOW_STATUS_COLOR: Record<WorkflowStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
};

export const RUN_STATUS_LABEL: Record<WorkflowRunStatus, string> = {
  INITIALIZED: '초기화',
  RUNNING: '실행 중',
  PAUSED: '일시정지',
  AWAITING: '대기 중',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

export const WORKFLOW_STATUS_LABEL: Record<WorkflowStatus, string> = {
  DRAFT: '초안',
  ACTIVE: '활성',
};

export const WORKSPACE_STATUS_COLOR: Record<WorkspaceStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
};

export const WORKSPACE_STATUS_LABEL: Record<WorkspaceStatus, string> = {
  ACTIVE: '활성',
  COMPLETED: '완료',
};

export const MODEL_OPTIONS = [
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
] as const;
