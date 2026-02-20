import apiClient from './client';
import type {
  WorkflowResponse,
  WorkflowListItem,
  WorkflowStatus,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
} from './types';

const STATUS_MAP: Record<string, WorkflowStatus> = {
  draft: 'DRAFT',
  DRAFT: 'DRAFT',
  active: 'ACTIVE',
  ACTIVE: 'ACTIVE',
  published: 'ACTIVE',
};

function normalizeStatus(raw: string): WorkflowStatus {
  return STATUS_MAP[raw] ?? raw.toUpperCase();
}

export const workflowsApi = {
  list: async (): Promise<WorkflowListItem[]> => {
    const res = await apiClient.get<unknown, WorkflowListItem[] | Record<string, unknown>>('/workflows');
    const items: WorkflowListItem[] = Array.isArray(res)
      ? res
      : (Object.values(res).find(Array.isArray) as WorkflowListItem[] | undefined) ?? [];
    return items.map((w) => ({ ...w, status: normalizeStatus(w.status) }));
  },
  get: (id: string) => apiClient.get<unknown, WorkflowResponse>(`/workflows/${id}`),
  create: (data: CreateWorkflowRequest) =>
    apiClient.post<unknown, WorkflowResponse>('/workflows', data),
  update: (id: string, data: UpdateWorkflowRequest) =>
    apiClient.put(`/workflows/${id}`, data),
  delete: (id: string) => apiClient.delete(`/workflows/${id}`),
  activate: (id: string) => apiClient.post(`/workflows/${id}/activate`),
  deactivate: (id: string) => apiClient.post(`/workflows/${id}/deactivate`),
};
