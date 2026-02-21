import { apiClient } from './client';
import type { McpServerResponse, RegisterMcpServerRequest } from './types';

export const mcpServersApi = {
  list: () => apiClient.get<unknown, McpServerResponse[]>('/mcp-servers'),
  register: (data: RegisterMcpServerRequest) =>
    apiClient.post<unknown, McpServerResponse>('/mcp-servers', data),
  unregister: (id: string) => apiClient.delete(`/mcp-servers/${id}`),
};
