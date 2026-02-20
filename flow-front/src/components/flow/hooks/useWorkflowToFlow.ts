import { useMemo } from 'react';
import type {
  FlowNodeType,
  FlowEdgeType,
  StartNodeData,
  EndNodeData,
  WorkNodeData,
  TaskNodeData,
  PauseIndicatorNodeData,
  AddButtonNodeData,
} from '../types';

interface WorkDefinitionLike {
  order: number;
  model: string;
  pauseAfter?: boolean;
  taskDefinitions: { order: number; query: string; reportOutline?: { sections: { title: string; description: string }[] } | null }[];
}

interface WorkflowFormLike {
  workDefinitions: WorkDefinitionLike[];
}

interface WorkflowToFlowOptions {
  onTogglePauseAfter?: (workIndex: number) => void;
  onRemovePause?: (afterWorkIndex: number) => void;
  onDeleteWork?: (workIndex: number) => void;
  onDeleteTask?: (workIndex: number, taskIndex: number) => void;
}

export function useWorkflowToFlow(
  values: WorkflowFormLike | undefined,
  mode: 'edit' | 'view' = 'edit',
  options?: WorkflowToFlowOptions,
): { nodes: FlowNodeType[]; edges: FlowEdgeType[] } {
  const onTogglePauseAfter = options?.onTogglePauseAfter;
  const onRemovePause = options?.onRemovePause;
  const onDeleteWork = options?.onDeleteWork;
  const onDeleteTask = options?.onDeleteTask;
  return useMemo(() => {
    if (!values || !values.workDefinitions.length) {
      const startNode: FlowNodeType = {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { label: 'Start' } satisfies StartNodeData,
      };
      const endNode: FlowNodeType = {
        id: 'end',
        type: 'end',
        position: { x: 0, y: 100 },
        data: { label: 'End' } satisfies EndNodeData,
      };
      return {
        nodes: [startNode, endNode],
        edges: [{ id: 'start-end', source: 'start', target: 'end', type: 'sequence' }],
      };
    }

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

    const workDefs = values.workDefinitions;

    for (let wi = 0; wi < workDefs.length; wi++) {
      const work = workDefs[wi];
      const workId = `work-${wi}`;

      // Add button before work (in edit mode)
      if (mode === 'edit') {
        const addBtnId = `add-before-${wi}`;
        nodes.push({
          id: addBtnId,
          type: 'addButton',
          position: { x: 0, y: 0 },
          data: { insertAtIndex: wi } satisfies AddButtonNodeData,
        });
        edges.push({
          id: `${prevSpineId}->${addBtnId}`,
          source: prevSpineId,
          target: addBtnId,
          sourceHandle: prevSpineId.startsWith('work-') ? 'spine' : undefined,
          type: 'sequence',
        });
        prevSpineId = addBtnId;
      }

      // Work node
      nodes.push({
        id: workId,
        type: 'work',
        position: { x: 0, y: 0 },
        data: {
          workIndex: wi,
          model: work.model,
          taskCount: work.taskDefinitions.length,
          pauseAfter: work.pauseAfter ?? false,
          isEditable: mode === 'edit',
          onTogglePauseAfter,
          onDeleteWork: mode === 'edit' ? onDeleteWork : undefined,
        } satisfies WorkNodeData,
      });
      edges.push({
        id: `${prevSpineId}->${workId}`,
        source: prevSpineId,
        target: workId,
        sourceHandle: prevSpineId.startsWith('work-') ? 'spine' : undefined,
        type: 'sequence',
      });

      // Task branch: Work → Task1 → Task2 → ... (horizontal)
      let taskPrevId = workId;
      for (let ti = 0; ti < work.taskDefinitions.length; ti++) {
        const task = work.taskDefinitions[ti];
        const taskId = `task-${wi}-${ti}`;
        nodes.push({
          id: taskId,
          type: 'task',
          position: { x: 0, y: 0 },
          data: {
            workIndex: wi,
            taskIndex: ti,
            query: task.query || '(empty)',
            hasReportOutline: !!(task.reportOutline?.sections?.length),
            onDeleteTask: mode === 'edit' ? onDeleteTask : undefined,
          } satisfies TaskNodeData,
        });
        edges.push({
          id: `${taskPrevId}->${taskId}`,
          source: taskPrevId,
          target: taskId,
          sourceHandle: taskPrevId === workId ? 'tasks' : undefined,
          type: 'sequence',
        });
        taskPrevId = taskId;
      }

      // Spine continues from Work (NOT from last task)
      prevSpineId = workId;

      // Pause indicator (stays in spine)
      if (work.pauseAfter) {
        const pauseId = `pause-${wi}`;
        nodes.push({
          id: pauseId,
          type: 'pauseIndicator',
          position: { x: 0, y: 0 },
          data: {
            afterWorkIndex: wi,
            isEditable: mode === 'edit',
            onRemovePause,
          } satisfies PauseIndicatorNodeData,
        });
        edges.push({
          id: `${prevSpineId}->${pauseId}`,
          source: prevSpineId,
          target: pauseId,
          sourceHandle: 'spine',
          type: 'sequence',
        });
        prevSpineId = pauseId;
      }
    }

    // Add button after last work (in edit mode)
    if (mode === 'edit') {
      const addBtnId = `add-after-${workDefs.length}`;
      nodes.push({
        id: addBtnId,
        type: 'addButton',
        position: { x: 0, y: 0 },
        data: { insertAtIndex: workDefs.length } satisfies AddButtonNodeData,
      });
      edges.push({
        id: `${prevSpineId}->${addBtnId}`,
        source: prevSpineId,
        target: addBtnId,
        sourceHandle: prevSpineId.startsWith('work-') ? 'spine' : undefined,
        type: 'sequence',
      });
      prevSpineId = addBtnId;
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
    });

    return { nodes, edges };
  }, [values, mode, onTogglePauseAfter, onRemovePause, onDeleteWork, onDeleteTask]);
}
