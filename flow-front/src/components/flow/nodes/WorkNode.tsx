import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { MODEL_OPTIONS } from '@/lib/constants';
import { NODE_STATUS_COLORS } from '../constants';
import type { WorkNode as WorkNodeType } from '../types';
import { Pause, Layers, Bookmark, GitBranch, Server, FileText, Loader2, X } from 'lucide-react';

function getModelLabel(model: string): string {
  return MODEL_OPTIONS.find((m) => m.value === model)?.label ?? model;
}

export function WorkNode({ data, selected }: NodeProps<WorkNodeType>) {
  const statusColors = data.status
    ? NODE_STATUS_COLORS[data.status]
    : NODE_STATUS_COLORS.pending;

  return (
    <div
      className={cn(
        'group/work relative w-[280px] rounded-lg border-2 px-3 py-2 shadow-sm transition-all duration-300',
        statusColors.bg,
        statusColors.border,
        selected && 'ring-2',
        selected && statusColors.ring,
        data.status === 'running' && 'flow-node-running',
      )}
    >
      {data.onDeleteWork && (
        <button
          type="button"
          className="absolute -top-2 -right-2 hidden group-hover/work:flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
          onClick={(e) => {
            e.stopPropagation();
            data.onDeleteWork!(data.workIndex);
          }}
          title="삭제"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm">
            Work #{data.workIndex + 1}
          </span>
          {data.status === 'running' && (
            <span className="flex items-center gap-0.5 text-xs text-green-600 font-medium">
              <Loader2 className="h-3 w-3 animate-spin" />
              실행 중
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {data.hasCheckpoint && (
            <Bookmark className="h-3 w-3 text-amber-500" />
          )}
          {data.isEditable && data.onTogglePauseAfter ? (
            <button
              type="button"
              className={cn(
                'p-0.5 rounded transition-colors',
                data.pauseAfter
                  ? 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100'
                  : 'text-gray-300 hover:text-yellow-600 hover:bg-yellow-50',
              )}
              onClick={(e) => {
                e.stopPropagation();
                data.onTogglePauseAfter!(data.workIndex);
              }}
              title={data.pauseAfter ? '일시정지 해제' : '완료 후 일시정지'}
            >
              <Pause className="h-3 w-3" />
            </button>
          ) : (
            data.pauseAfter && <Pause className="h-3 w-3 text-yellow-600" />
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={cn('px-1.5 py-0.5 rounded font-medium', statusColors.text, statusColors.bg)}>
          {getModelLabel(data.model)}
        </span>
        <div className="flex items-center gap-2 text-muted-foreground">
          {(data.gitRefCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <GitBranch className="h-3 w-3" />
              {data.gitRefCount}
            </span>
          )}
          {(data.mcpServerRefCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <Server className="h-3 w-3" />
              {data.mcpServerRefCount}
            </span>
          )}
          {(data.reportFileRefCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-violet-500">
              <FileText className="h-3 w-3" />
              {data.reportFileRefCount}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Layers className="h-3 w-3" />
            {data.taskCount}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="spine" className="!bg-gray-400" />
      {data.taskCount > 0 && (
        <Handle type="source" position={Position.Right} id="tasks" className="!bg-gray-400" />
      )}
    </div>
  );
}
