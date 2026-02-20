import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gitsApi } from '@/api/gits';
import { queryKeys } from '@/lib/query-keys';

export function useGits() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.gits.all,
    queryFn: () => gitsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: gitsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gits.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gitsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gits.all });
    },
  });

  return { listQuery, createMutation, deleteMutation };
}
