import { apiClient } from './client';
import type {
  WorkspaceListItem,
  WorkspaceDetailResponse,
  CreateWorkspaceRequest,
  ChatMessageResponse,
  SendChatMessageRequest,
  FileTreeEntry,
  WorkspaceFileContent,
  DiffFileInfo,
  AgentLogEntryResponse,
  PushBranchesResult,
  MergeBranchesRequest,
  MergeBranchesResponse,
  WorkflowPreview,
  BuildWorkflowResponse,
} from './types';

export const workspacesApi = {
  list: () => apiClient.get<unknown, WorkspaceListItem[]>('/workspaces'),
  get: (id: string) => apiClient.get<unknown, WorkspaceDetailResponse>(`/workspaces/${id}`),
  create: (data: CreateWorkspaceRequest) =>
    apiClient.post<unknown, { workspaceId: string }>('/workspaces', data, { timeout: 120_000 }),
  delete: (id: string) => apiClient.delete(`/workspaces/${id}`),
  complete: (id: string) => apiClient.post(`/workspaces/${id}/complete`),
  chat: (id: string, data: SendChatMessageRequest) =>
    apiClient.post<unknown, ChatMessageResponse>(`/workspaces/${id}/chat`, data),
  tree: (id: string) => apiClient.get<unknown, FileTreeEntry[]>(`/workspaces/${id}/tree`),
  file: (id: string, path: string) =>
    apiClient.get<unknown, WorkspaceFileContent>(`/workspaces/${id}/file`, { params: { path } }),
  diff: (id: string, gitId?: string) =>
    apiClient.get<unknown, DiffFileInfo[]>(`/workspaces/${id}/diff`, {
      params: gitId ? { gitId } : undefined,
    }),
  agentLogs: (id: string) =>
    apiClient.get<unknown, AgentLogEntryResponse[]>(`/workspaces/${id}/agent-logs`),
  pushBranches: (id: string) =>
    apiClient.post<unknown, PushBranchesResult>(`/workspaces/${id}/push`),
  mergeBranches: (workspaceId: string, data: MergeBranchesRequest) =>
    apiClient.post<unknown, MergeBranchesResponse>(`/workspaces/${workspaceId}/merge`, data),
  getWorkflowPreview: (id: string) =>
    apiClient.get<unknown, WorkflowPreview | null>(`/workspaces/${id}/workflow-preview`),
  buildWorkflow: (id: string) =>
    apiClient.post<unknown, BuildWorkflowResponse>(`/workspaces/${id}/build-workflow`),
};
