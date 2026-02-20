import type { Node, Edge } from '@xyflow/react';
import type { WorkflowRunStatus } from '@/api/types';

// ─── Flow mode ───

export type FlowMode = 'edit' | 'view';

// ─── Node status for run view ───

export type NodeStatus =
  | 'completed'
  | 'running'
  | 'paused'
  | 'awaiting'
  | 'pending'
  | 'cancelled';

// ─── Node data types ───

export interface StartNodeData {
  label: string;
  [key: string]: unknown;
}

export interface EndNodeData {
  label: string;
  [key: string]: unknown;
}

export interface WorkNodeData {
  workIndex: number;
  model: string;
  taskCount: number;
  pauseAfter: boolean;
  gitRefCount?: number;
  mcpServerRefCount?: number;
  status?: NodeStatus;
  hasCheckpoint?: boolean;
  collapsed?: boolean;
  isEditable?: boolean;
  onTogglePauseAfter?: (sequence: number) => void;
  onDeleteWork?: (workIndex: number) => void;
  [key: string]: unknown;
}

export interface TaskNodeData {
  workIndex: number;
  taskIndex: number;
  query: string;
  hasReportOutline: boolean;
  status?: NodeStatus;
  workExecutionId?: string;
  onDeleteTask?: (workIndex: number, taskIndex: number) => void;
  [key: string]: unknown;
}

export interface PauseIndicatorNodeData {
  afterWorkIndex: number;
  isEditable?: boolean;
  onRemovePause?: (sequence: number) => void;
  [key: string]: unknown;
}

export interface AddButtonNodeData {
  insertAtIndex: number;
  [key: string]: unknown;
}

// ─── Typed nodes ───

export type StartNode = Node<StartNodeData, 'start'>;
export type EndNode = Node<EndNodeData, 'end'>;
export type WorkNode = Node<WorkNodeData, 'work'>;
export type TaskNode = Node<TaskNodeData, 'task'>;
export type PauseIndicatorNode = Node<PauseIndicatorNodeData, 'pauseIndicator'>;
export type AddButtonNode = Node<AddButtonNodeData, 'addButton'>;

export type FlowNodeType =
  | StartNode
  | EndNode
  | WorkNode
  | TaskNode
  | PauseIndicatorNode
  | AddButtonNode;

// ─── Edge data ───

export interface SequenceEdgeData {
  status?: NodeStatus;
  [key: string]: unknown;
}

export type FlowEdgeType = Edge<SequenceEdgeData>;

// ─── Callbacks ───

export interface FlowEditorCallbacks {
  onNodeSelect?: (nodeId: string | null) => void;
  onAddWork?: (insertAtIndex: number) => void;
  onDeleteWork?: (workIndex: number) => void;
  onMoveWork?: (workIndex: number, direction: 'up' | 'down') => void;
}

export interface FlowRunCallbacks {
  onNodeSelect?: (nodeId: string | null) => void;
}

// ─── Run status mapping ───

export function mapRunStatus(
  sequence: number,
  currentWorkIndex: number,
  runStatus: WorkflowRunStatus,
  cancelledAtWorkIndex: number | null,
): NodeStatus {
  if (cancelledAtWorkIndex !== null && runStatus === 'CANCELLED') {
    if (sequence < cancelledAtWorkIndex) return 'completed';
    if (sequence === cancelledAtWorkIndex) return 'cancelled';
    return 'cancelled';
  }
  if (sequence < currentWorkIndex) return 'completed';
  if (sequence === currentWorkIndex) {
    if (runStatus === 'RUNNING') return 'running';
    if (runStatus === 'PAUSED') return 'paused';
    if (runStatus === 'AWAITING') return 'awaiting';
    if (runStatus === 'COMPLETED') return 'completed';
    if (runStatus === 'CANCELLED') return 'cancelled';
    return 'pending';
  }
  return 'pending';
}
