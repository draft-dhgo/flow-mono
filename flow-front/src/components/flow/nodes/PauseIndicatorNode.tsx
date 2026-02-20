import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { PauseIndicatorNode as PauseNodeType } from '../types';
import { Pause } from 'lucide-react';

export function PauseIndicatorNode({ data }: NodeProps<PauseNodeType>) {
  const isInteractive = data.isEditable && !!data.onRemovePause;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1 w-[200px] transition-opacity',
        isInteractive && 'cursor-pointer hover:opacity-50',
      )}
      onClick={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        data.onRemovePause!(data.afterWorkIndex);
      }}
      title={isInteractive ? '클릭하여 일시정지 해제' : undefined}
    >
      <Handle type="target" position={Position.Top} className="!bg-yellow-400" />
      <div className="flex-1 border-t-2 border-dashed border-yellow-400" />
      <Pause className="h-3 w-3 text-yellow-600 shrink-0" />
      <span className="text-xs text-yellow-600 font-medium whitespace-nowrap">Pause</span>
      <div className="flex-1 border-t-2 border-dashed border-yellow-400" />
      <Handle type="source" position={Position.Bottom} className="!bg-yellow-400" />
    </div>
  );
}
