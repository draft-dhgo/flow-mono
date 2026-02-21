import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import type { WorkflowPreview } from '@/api/types';
import type { FlowNodeType, FlowEdgeType } from '@/components/flow/types';
import { StartNode } from '@/components/flow/nodes/StartNode';
import { EndNode } from '@/components/flow/nodes/EndNode';
import { WorkNode } from '@/components/flow/nodes/WorkNode';
import { TaskNode } from '@/components/flow/nodes/TaskNode';
import { SequenceEdge } from '@/components/flow/edges/SequenceEdge';
import { ReportRefEdge } from '@/components/flow/edges/ReportRefEdge';
import { useFlowLayout } from '@/components/flow/hooks/useFlowLayout';

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  work: WorkNode,
  task: TaskNode,
};

const edgeTypes = {
  sequence: SequenceEdge,
  reportRef: ReportRefEdge,
};

interface WorkflowPreviewCanvasProps {
  preview: WorkflowPreview | null;
  onBuild?: () => void;
  isBuildPending?: boolean;
}

function buildFlowFromPreview(preview: WorkflowPreview): {
  nodes: FlowNodeType[];
  edges: FlowEdgeType[];
} {
  const nodes: FlowNodeType[] = [];
  const edges: FlowEdgeType[] = [];

  // Start node
  nodes.push({
    id: 'start',
    type: 'start',
    position: { x: 0, y: 0 },
    data: { label: 'Start' },
  });

  // Work definition nodes + task nodes
  for (const wd of preview.workDefinitions) {
    const workId = `work-${wd.order}`;
    nodes.push({
      id: workId,
      type: 'work',
      position: { x: 0, y: 0 },
      data: {
        workIndex: wd.order,
        model: wd.model,
        taskCount: wd.taskDefinitions.length,
        pauseAfter: wd.pauseAfter,
        reportFileRefCount: wd.reportFileRefs.length,
      },
    });

    // Task nodes
    for (const td of wd.taskDefinitions) {
      const taskId = `task-${wd.order}-${td.order}`;
      nodes.push({
        id: taskId,
        type: 'task',
        position: { x: 0, y: 0 },
        data: {
          workIndex: wd.order,
          taskIndex: td.order,
          query: td.query,
          hasReportOutline: td.reportOutline !== null,
        },
      });
    }
  }

  // End node
  nodes.push({
    id: 'end',
    type: 'end',
    position: { x: 0, y: 0 },
    data: { label: 'End' },
  });

  // Sequence edges: start -> work0 -> work1 -> ... -> end
  const sortedWorks = [...preview.workDefinitions].sort((a, b) => a.order - b.order);
  let prevId = 'start';
  for (const wd of sortedWorks) {
    const workId = `work-${wd.order}`;
    edges.push({
      id: `edge-${prevId}-${workId}`,
      source: prevId,
      target: workId,
      type: 'sequence',
    });
    prevId = workId;
  }
  edges.push({
    id: `edge-${prevId}-end`,
    source: prevId,
    target: 'end',
    type: 'sequence',
  });

  // Report ref edges
  for (const wd of preview.workDefinitions) {
    for (const refOrder of wd.reportFileRefs) {
      edges.push({
        id: `ref-${refOrder}-${wd.order}`,
        source: `work-${refOrder}`,
        target: `work-${wd.order}`,
        type: 'reportRef',
      });
    }
  }

  return { nodes, edges };
}

export function WorkflowPreviewCanvas({ preview, onBuild, isBuildPending }: WorkflowPreviewCanvasProps) {
  const rawFlow = useMemo(
    () => (preview ? buildFlowFromPreview(preview) : { nodes: [], edges: [] }),
    [preview],
  );

  const { nodes, edges } = useFlowLayout(rawFlow.nodes, rawFlow.edges);

  if (!preview) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Sparkles className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">에이전트에게 워크플로우를 설계해달라고 요청하세요.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Metadata */}
      <div className="shrink-0 p-3 border-b space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{preview.name}</h3>
          {onBuild && (
            <Button size="sm" onClick={onBuild} disabled={isBuildPending}>
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {isBuildPending ? '생성 중...' : '워크플로우 생성'}
            </Button>
          )}
        </div>
        {preview.description && (
          <p className="text-xs text-muted-foreground">{preview.description}</p>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>브랜치 전략: {preview.branchStrategy}</span>
          {preview.seedKeys.length > 0 && (
            <span>Seeds: {preview.seedKeys.join(', ')}</span>
          )}
          <span>Work {preview.workDefinitions.length}개</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
