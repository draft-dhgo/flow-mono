import type { NodeStatus } from './types';

// ─── Node dimensions ───

export const NODE_DIMENSIONS = {
  start: { width: 60, height: 60 },
  end: { width: 60, height: 60 },
  work: { width: 280, height: 80 },
  task: { width: 240, height: 60 },
  pauseIndicator: { width: 200, height: 30 },
  addButton: { width: 40, height: 40 },
} as const;

// ─── Layout spacing ───

export const LAYOUT_CONFIG = {
  rankSep: 60,
  nodeSep: 30,
  direction: 'TB' as const,
  workTaskGap: 20,
  taskTaskGap: 16,
} as const;

// ─── Status colors (Tailwind classes) ───

export const NODE_STATUS_COLORS: Record<NodeStatus, {
  bg: string;
  border: string;
  text: string;
  ring: string;
}> = {
  completed: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-700',
    ring: 'ring-blue-200',
  },
  running: {
    bg: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-700',
    ring: 'ring-green-200',
  },
  paused: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    text: 'text-yellow-700',
    ring: 'ring-yellow-200',
  },
  awaiting: {
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    text: 'text-orange-700',
    ring: 'ring-orange-200',
  },
  pending: {
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    text: 'text-gray-500',
    ring: 'ring-gray-200',
  },
  cancelled: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-700',
    ring: 'ring-red-200',
  },
};

export const EDGE_STATUS_COLORS: Record<NodeStatus, string> = {
  completed: '#60a5fa',
  running: '#34d399',
  paused: '#fbbf24',
  awaiting: '#fb923c',
  pending: '#d1d5db',
  cancelled: '#f87171',
};

export const REPORT_REF_EDGE_COLOR = '#a78bfa';

// ─── Status labels ───

export const NODE_STATUS_LABELS: Record<NodeStatus, string> = {
  completed: '완료',
  running: '실행 중',
  paused: '일시정지',
  awaiting: '대기 중',
  pending: '대기',
  cancelled: '취소',
};
