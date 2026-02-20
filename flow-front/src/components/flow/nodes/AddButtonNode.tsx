import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { AddButtonNode as AddBtnNodeType } from '../types';
import { Plus } from 'lucide-react';

export function AddButtonNode(_props: NodeProps<AddBtnNodeType>) {
  return (
    <div
      className="flex items-center justify-center w-[40px] h-[40px] rounded-full border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-300 !w-1 !h-1" />
      <Plus className="h-4 w-4 text-gray-400" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-1 !h-1" />
    </div>
  );
}
