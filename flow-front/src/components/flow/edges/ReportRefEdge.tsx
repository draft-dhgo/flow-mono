import { BaseEdge, getBezierPath } from '@xyflow/react';
import type { EdgeProps, Edge } from '@xyflow/react';
import { REPORT_REF_EDGE_COLOR } from '../constants';

export type ReportRefEdgeType = Edge<Record<string, unknown>, 'reportRef'>;

export function ReportRefEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps<ReportRefEdgeType>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: REPORT_REF_EDGE_COLOR,
        strokeWidth: 1.5,
        strokeDasharray: '6 3',
        opacity: 0.7,
      }}
    />
  );
}
