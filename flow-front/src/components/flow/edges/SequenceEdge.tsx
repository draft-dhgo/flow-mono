import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { EDGE_STATUS_COLORS } from '../constants';
import type { FlowEdgeType } from '../types';
import type { NodeStatus } from '../types';

export function SequenceEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<FlowEdgeType>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const status: NodeStatus = (data?.status as NodeStatus) ?? 'pending';
  const stroke = EDGE_STATUS_COLORS[status];
  const isRunning = status === 'running';

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke,
        strokeWidth: 2,
        strokeDasharray: isRunning ? '8 4' : undefined,
        animation: isRunning ? 'flow-dash 1s linear infinite' : undefined,
      }}
    />
  );
}
