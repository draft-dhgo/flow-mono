import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { StartNode as StartNodeType } from '../types';

export function StartNode({ data }: NodeProps<StartNodeType>) {
  return (
    <div className="flex items-center justify-center w-[60px] h-[60px] rounded-full bg-green-500 text-white font-bold text-xs shadow-md">
      {data.label}
      <Handle type="source" position={Position.Bottom} className="!bg-green-600" />
    </div>
  );
}
