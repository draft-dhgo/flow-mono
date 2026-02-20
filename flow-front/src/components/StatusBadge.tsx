import { Badge } from '@/components/ui/badge';
import { RUN_STATUS_COLOR, WORKFLOW_STATUS_COLOR } from '@/lib/constants';
import { formatRunStatus, formatWorkflowStatus } from '@/lib/format';
import type { WorkflowRunStatus, WorkflowStatus } from '@/api/types';

interface StatusBadgeProps {
  status: WorkflowRunStatus | WorkflowStatus;
  type?: 'run' | 'workflow';
}

export function StatusBadge({ status, type = 'run' }: StatusBadgeProps) {
  const colorClass =
    type === 'workflow'
      ? WORKFLOW_STATUS_COLOR[status as WorkflowStatus]
      : RUN_STATUS_COLOR[status as WorkflowRunStatus];

  const label =
    type === 'workflow'
      ? formatWorkflowStatus(status as WorkflowStatus)
      : formatRunStatus(status as WorkflowRunStatus);

  return (
    <Badge variant="secondary" className={colorClass}>
      {label}
    </Badge>
  );
}
