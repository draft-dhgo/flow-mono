import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mcpServersApi } from '@/api/mcp-servers';
import { queryKeys } from '@/lib/query-keys';

export function useMcpServers() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.mcpServers.all,
    queryFn: () => mcpServersApi.list(),
  });

  const registerMutation = useMutation({
    mutationFn: mcpServersApi.register,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
    },
  });

  const unregisterMutation = useMutation({
    mutationFn: (id: string) => mcpServersApi.unregister(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
    },
  });

  return { listQuery, registerMutation, unregisterMutation };
}
