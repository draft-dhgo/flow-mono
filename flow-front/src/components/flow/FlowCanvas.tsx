import { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type OnNodesChange,
  type NodeMouseHandler,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { FlowMode, FlowNodeType, FlowEdgeType } from './types';
import { StartNode } from './nodes/StartNode';
import { EndNode } from './nodes/EndNode';
import { WorkNode } from './nodes/WorkNode';
import { TaskNode } from './nodes/TaskNode';
import { PauseIndicatorNode } from './nodes/PauseIndicatorNode';
import { AddButtonNode } from './nodes/AddButtonNode';
import { SequenceEdge } from './edges/SequenceEdge';
import { ReportRefEdge } from './edges/ReportRefEdge';
import { useEffect } from 'react';

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  work: WorkNode,
  task: TaskNode,
  pauseIndicator: PauseIndicatorNode,
  addButton: AddButtonNode,
};

const edgeTypes = {
  sequence: SequenceEdge,
  reportRef: ReportRefEdge,
};

interface FlowCanvasProps {
  mode: FlowMode;
  nodes: FlowNodeType[];
  edges: FlowEdgeType[];
  onNodeSelect?: (nodeId: string | null) => void;
  className?: string;
}

export function FlowCanvas({
  mode,
  nodes: externalNodes,
  edges: externalEdges,
  onNodeSelect,
  className,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(externalNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(externalEdges);

  useEffect(() => {
    setNodes(externalNodes);
  }, [externalNodes, setNodes]);

  useEffect(() => {
    setEdges(externalEdges);
  }, [externalEdges, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect],
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const isView = mode === 'view';

  // In view mode, only allow selection changes (not drag/position changes)
  const onViewModeNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const selectionChanges = changes.filter((c) => c.type === 'select');
      if (selectionChanges.length > 0) {
        setNodes((nds) => applyNodeChanges(selectionChanges, nds));
      }
    },
    [setNodes],
  );

  return (
    <div className={className}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isView ? onViewModeNodesChange : onNodesChange}
        onEdgesChange={isView ? undefined : onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        nodesDraggable={!isView}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-gray-50"
        />
      </ReactFlow>
    </div>
  );
}
