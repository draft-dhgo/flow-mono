import { Badge } from '@/components/ui/badge';
import { RUN_STATUS_COLOR, WORKFLOW_STATUS_COLOR, WORKSPACE_STATUS_COLOR } from '@/lib/constants';
import { formatRunStatus, formatWorkflowStatus, formatWorkspaceStatus } from '@/lib/format';
import type { WorkflowRunStatus, WorkflowStatus, WorkspaceStatus } from '@/api/types';

interface StatusBadgeProps {
  status: WorkflowRunStatus | WorkflowStatus | WorkspaceStatus;
  type?: 'run' | 'workflow' | 'workspace';
}

export function StatusBadge({ status, type = 'run' }: StatusBadgeProps) {
  const colorClass =
    type === 'workspace'
      ? WORKSPACE_STATUS_COLOR[status as WorkspaceStatus]
      : type === 'workflow'
        ? WORKFLOW_STATUS_COLOR[status as WorkflowStatus]
        : RUN_STATUS_COLOR[status as WorkflowRunStatus];

  const label =
    type === 'workspace'
      ? formatWorkspaceStatus(status as WorkspaceStatus)
      : type === 'workflow'
        ? formatWorkflowStatus(status as WorkflowStatus)
        : formatRunStatus(status as WorkflowRunStatus);

  return (
    <Badge variant="secondary" className={colorClass}>
      {label}
    </Badge>
  );
}
