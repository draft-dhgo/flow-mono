import { apiClient } from './client';
import type {
  WorkflowRunDetailResponse,
  WorkflowRunListItem,
  RunSummary,
  CheckpointResponse,
  StartWorkflowRunRequest,
  EditWorkNodeConfigRequest,
  AddWorkNodeRequest,
  AgentLogEntryResponse,
  FileTreeEntry,
  WorkspaceFileContent,
  PushBranchesResult,
} from './types';

export const workflowRunsApi = {
  start: (data: StartWorkflowRunRequest) =>
    apiClient.post<unknown, { workflowRunId: string }>('/workflow-runs', data),
  getDetail: (id: string) =>
    apiClient.get<unknown, WorkflowRunDetailResponse>(`/workflow-runs/${id}`),
  list: async (): Promise<WorkflowRunListItem[]> => {
    const res = await apiClient.get<unknown, WorkflowRunListItem[] | Record<string, unknown>>('/workflow-runs');
    if (Array.isArray(res)) return res;
    const arr = Object.values(res).find(Array.isArray);
    return (arr as WorkflowRunListItem[]) ?? [];
  },
  getSummary: () => apiClient.get<unknown, RunSummary>('/workflow-runs/summary'),
  getCheckpoints: (id: string) =>
    apiClient.get<unknown, CheckpointResponse[]>(`/workflow-runs/${id}/checkpoints`),

  pause: (id: string) => apiClient.post(`/workflow-runs/${id}/pause`),
  resume: (id: string, checkpointId?: string) =>
    apiClient.post(`/workflow-runs/${id}/resume`, checkpointId ? { checkpointId } : {}),
  cancel: (id: string, reason?: string) =>
    apiClient.post(`/workflow-runs/${id}/cancel`, reason ? { reason } : {}),
  delete: (id: string) => apiClient.delete(`/workflow-runs/${id}`),
  restore: (id: string, checkpointId: string) =>
    apiClient.post(`/workflow-runs/${id}/restore`, { checkpointId }),

  editWorkNode: (id: string, sequence: number, config: EditWorkNodeConfigRequest) =>
    apiClient.put(`/workflow-runs/${id}/work-nodes/${sequence}`, config),
  addWorkNode: (id: string, config: AddWorkNodeRequest) =>
    apiClient.post(`/workflow-runs/${id}/work-nodes`, config),
  deleteWorkNode: (id: string, sequence: number) =>
    apiClient.delete(`/workflow-runs/${id}/work-nodes/${sequence}`),

  getWorkspaceTree: (id: string) =>
    apiClient.get<unknown, FileTreeEntry[]>(`/workflow-runs/${id}/workspace/tree`),
  getWorkspaceFile: (id: string, filePath: string) =>
    apiClient.get<unknown, WorkspaceFileContent>(`/workflow-runs/${id}/workspace/file`, {
      params: { path: filePath },
    }),
  pushBranches: (id: string) =>
    apiClient.post<unknown, PushBranchesResult>(`/workflow-runs/${id}/push`),
};

export const reportsApi = {
  get: (id: string) => apiClient.get<unknown, { content: string }>(`/reports/${id}`),
};

export const agentLogsApi = {
  getAll: (runId: string, weId: string) =>
    apiClient.get<unknown, AgentLogEntryResponse[]>(
      `/workflow-runs/${runId}/work-executions/${weId}/agent-logs`,
    ),
};
