import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { EndNode as EndNodeType } from '../types';

export function EndNode({ data }: NodeProps<EndNodeType>) {
  return (
    <div className="flex items-center justify-center w-[60px] h-[60px] rounded-full bg-gray-600 text-white font-bold text-xs shadow-md">
      {data.label}
      <Handle type="target" position={Position.Top} className="!bg-gray-700" />
    </div>
  );
}
