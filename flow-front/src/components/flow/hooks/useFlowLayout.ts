import { useMemo } from 'react';
import type { FlowNodeType, FlowEdgeType, TaskNodeData } from '../types';
import { NODE_DIMENSIONS, LAYOUT_CONFIG } from '../constants';

/**
 * Custom layout: Work nodes form a vertical spine (TB),
 * Task nodes chain horizontally to the right of their parent Work.
 */
export function useFlowLayout(
  nodes: FlowNodeType[],
  edges: FlowEdgeType[],
): { nodes: FlowNodeType[]; edges: FlowEdgeType[] } {
  return useMemo(() => {
    if (nodes.length === 0) return { nodes, edges };

    const centerX = 0;
    const { rankSep, workTaskGap, taskTaskGap } = LAYOUT_CONFIG;

    // Group task nodes by workIndex
    const tasksByWork = new Map<number, FlowNodeType[]>();
    for (const node of nodes) {
      if (node.type === 'task') {
        const workIndex = (node.data as TaskNodeData).workIndex;
        const list = tasksByWork.get(workIndex) ?? [];
        list.push(node);
        tasksByWork.set(workIndex, list);
      }
    }
    // Sort tasks within each group by taskIndex
    for (const [, tasks] of tasksByWork) {
      tasks.sort(
        (a, b) =>
          (a.data as TaskNodeData).taskIndex - (b.data as TaskNodeData).taskIndex,
      );
    }

    // Collect spine nodes in order (non-task nodes), preserving original array order
    const spineNodes: FlowNodeType[] = nodes.filter((n) => n.type !== 'task');

    const positionMap = new Map<string, { x: number; y: number }>();
    let y = 0;

    for (const node of spineNodes) {
      const dims = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS]
        ?? NODE_DIMENSIONS.work;

      positionMap.set(node.id, {
        x: centerX - dims.width / 2,
        y,
      });

      // Position tasks to the right of this Work node
      if (node.type === 'work') {
        const workIndex = (node.data as { workIndex: number }).workIndex;
        const tasks = tasksByWork.get(workIndex) ?? [];
        const taskDims = NODE_DIMENSIONS.task;
        let taskX = centerX + dims.width / 2 + workTaskGap;
        const taskY = y + (dims.height - taskDims.height) / 2;

        for (const task of tasks) {
          positionMap.set(task.id, { x: taskX, y: taskY });
          taskX += taskDims.width + taskTaskGap;
        }
      }

      y += dims.height + rankSep;
    }

    const layoutedNodes = nodes.map((node) => {
      const pos = positionMap.get(node.id);
      return {
        ...node,
        position: pos ?? node.position,
      };
    });

    return { nodes: layoutedNodes, edges };
  }, [nodes, edges]);
}
