import { useMemo } from 'react';
import type {
  FlowNodeType,
  FlowEdgeType,
  StartNodeData,
  EndNodeData,
  WorkNodeData,
  TaskNodeData,
  PauseIndicatorNodeData,
  NodeStatus,
} from '../types';
import { mapRunStatus } from '../types';
import type {
  WorkflowRunDetailResponse,
  CheckpointResponse,
} from '@/api/types';

export function useWorkflowRunToFlow(
  runDetail: WorkflowRunDetailResponse | undefined,
  checkpoints: CheckpointResponse[] | undefined,
  options?: {
    editableFromSequence?: number;
    onTogglePauseAfter?: (sequence: number) => void;
  },
): { nodes: FlowNodeType[]; edges: FlowEdgeType[] } {
  return useMemo(() => {
    if (!runDetail) return { nodes: [], edges: [] };

    const nodes: FlowNodeType[] = [];
    const edges: FlowEdgeType[] = [];
    let prevSpineId = 'start';

    // Start node
    nodes.push({
      id: 'start',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { label: 'Start' } satisfies StartNodeData,
    });

    const configs = runDetail.workNodeConfigs ?? [];

    for (let seq = 0; seq < runDetail.totalWorkCount; seq++) {
      const nodeConfig = configs[seq];
      const workId = `work-${seq}`;

      const status: NodeStatus = mapRunStatus(
        seq,
        runDetail.currentWorkIndex,
        runDetail.status,
        runDetail.cancelledAtWorkIndex,
      );

      const hasCheckpoint = !!checkpoints?.some((cp) => cp.workSequence === seq);
      const isNodeEditable = options?.editableFromSequence !== undefined
        && seq >= options.editableFromSequence;

      // Work node
      nodes.push({
        id: workId,
        type: 'work',
        position: { x: 0, y: 0 },
        data: {
          workIndex: seq,
          model: nodeConfig?.model ?? 'unknown',
          taskCount: nodeConfig?.taskCount ?? 0,
          pauseAfter: nodeConfig?.pauseAfter ?? false,
          gitRefCount: nodeConfig?.gitRefConfigs?.length ?? 0,
          mcpServerRefCount: nodeConfig?.mcpServerRefConfigs?.length ?? 0,
          reportFileRefCount: nodeConfig?.reportFileRefs?.length ?? 0,
          status,
          hasCheckpoint,
          isEditable: isNodeEditable,
          onTogglePauseAfter: isNodeEditable ? options?.onTogglePauseAfter : undefined,
        } satisfies WorkNodeData,
      });

      // Spine edge: previous spine node → this Work
      const edgeStatus: NodeStatus = seq <= runDetail.currentWorkIndex ? status : 'pending';
      edges.push({
        id: `${prevSpineId}->${workId}`,
        source: prevSpineId,
        target: workId,
        sourceHandle: prevSpineId.startsWith('work-') ? 'spine' : undefined,
        type: 'sequence',
        data: { status: edgeStatus },
      });

      // Task branch: Work → Task1 → Task2 → ... (horizontal)
      let taskPrevId = workId;
      const taskCount = nodeConfig?.taskCount ?? 0;
      for (let ti = 0; ti < taskCount; ti++) {
        const taskId = `task-${seq}-${ti}`;
        const taskConfig = nodeConfig?.taskConfigs?.[ti];
        nodes.push({
          id: taskId,
          type: 'task',
          position: { x: 0, y: 0 },
          data: {
            workIndex: seq,
            taskIndex: ti,
            query: taskConfig?.query ?? `Task ${ti + 1}`,
            hasReportOutline: taskConfig?.hasReportOutline ?? false,
            status,
            workExecutionId: runDetail.workExecutionIds?.[seq],
          } satisfies TaskNodeData,
        });
        edges.push({
          id: `${taskPrevId}->${taskId}`,
          source: taskPrevId,
          target: taskId,
          sourceHandle: taskPrevId === workId ? 'tasks' : undefined,
          type: 'sequence',
          data: { status },
        });
        taskPrevId = taskId;
      }

      // Spine continues from Work (NOT from last task)
      prevSpineId = workId;

      // Pause indicator (stays in spine)
      if (nodeConfig?.pauseAfter) {
        const pauseId = `pause-${seq}`;
        nodes.push({
          id: pauseId,
          type: 'pauseIndicator',
          position: { x: 0, y: 0 },
          data: {
            afterWorkIndex: seq,
            isEditable: isNodeEditable,
            onRemovePause: isNodeEditable ? options?.onTogglePauseAfter : undefined,
          } satisfies PauseIndicatorNodeData,
        });
        edges.push({
          id: `${prevSpineId}->${pauseId}`,
          source: prevSpineId,
          target: pauseId,
          sourceHandle: 'spine',
          type: 'sequence',
          data: { status },
        });
        prevSpineId = pauseId;
      }
    }

    // Report ref edges (dashed purple curves between work nodes)
    for (let seq = 0; seq < runDetail.totalWorkCount; seq++) {
      const nodeConfig = configs[seq];
      const refs = nodeConfig?.reportFileRefs ?? [];
      for (const sourceSeq of refs) {
        edges.push({
          id: `reportRef-${sourceSeq}->${seq}`,
          source: `work-${sourceSeq}`,
          target: `work-${seq}`,
          sourceHandle: 'spine',
          type: 'reportRef',
        });
      }
    }

    // End node
    nodes.push({
      id: 'end',
      type: 'end',
      position: { x: 0, y: 0 },
      data: { label: 'End' } satisfies EndNodeData,
    });
    edges.push({
      id: `${prevSpineId}->end`,
      source: prevSpineId,
      target: 'end',
      sourceHandle: prevSpineId.startsWith('work-') ? 'spine' : undefined,
      type: 'sequence',
      data: {
        status: runDetail.status === 'COMPLETED' ? 'completed' : 'pending',
      },
    });

    return { nodes, edges };
  }, [runDetail, checkpoints, options?.editableFromSequence, options?.onTogglePauseAfter]);
}
