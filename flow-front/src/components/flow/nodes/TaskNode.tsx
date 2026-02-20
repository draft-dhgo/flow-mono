import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { NODE_STATUS_COLORS } from '../constants';
import type { TaskNode as TaskNodeType } from '../types';
import { FileText, Loader2, X } from 'lucide-react';

function truncateQuery(query: string, maxLength = 40): string {
  if (query.length <= maxLength) return query;
  return query.slice(0, maxLength) + '...';
}

export function TaskNode({ data, selected }: NodeProps<TaskNodeType>) {
  const statusColors = data.status
    ? NODE_STATUS_COLORS[data.status]
    : NODE_STATUS_COLORS.pending;

  return (
    <div
      className={cn(
        'group/task relative w-[240px] rounded-md border px-3 py-2 shadow-sm transition-all duration-300',
        statusColors.bg,
        statusColors.border,
        selected && 'ring-2',
        selected && statusColors.ring,
        data.status === 'running' && 'flow-node-running',
      )}
    >
      {data.onDeleteTask && (
        <button
          type="button"
          className="absolute -top-2 -right-2 hidden group-hover/task:flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
          onClick={(e) => {
            e.stopPropagation();
            data.onDeleteTask!(data.workIndex, data.taskIndex);
          }}
          title="삭제"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1">
          <span className="font-medium text-xs">
            Task #{data.taskIndex + 1}
          </span>
          {data.status === 'running' && (
            <span className="flex items-center gap-0.5 text-xs text-green-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              실행 중
            </span>
          )}
          {data.status === 'completed' && (
            <span className="text-xs text-blue-600">완료</span>
          )}
        </div>
        {data.hasReportOutline && (
          <FileText className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-tight">
        {truncateQuery(data.query)}
      </p>
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </div>
  );
}
