import apiClient from './client';
import type { GitResponse, CreateGitRequest } from './types';

export const gitsApi = {
  list: () => apiClient.get<unknown, GitResponse[]>('/gits'),
  create: (data: CreateGitRequest) => apiClient.post<unknown, GitResponse>('/gits', data),
  delete: (id: string) => apiClient.delete(`/gits/${id}`),
};
