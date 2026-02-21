import apiClient from './client';
import type { WorkLineageEntry } from './types';

export const workLineageApi = {
  getLineage: () => apiClient.get<unknown, WorkLineageEntry[]>('/work-lineage'),

  exportLineage: async (): Promise<string> => {
    const response = await apiClient.get<unknown, string>('/work-lineage/export', {
      responseType: 'text',
      transformResponse: [(data: string) => data],
    });
    return response as unknown as string;
  },
};
