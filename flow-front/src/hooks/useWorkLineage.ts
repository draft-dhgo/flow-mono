import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { workLineageApi } from '@/api/work-lineage';

export function useWorkLineage() {
  const lineageQuery = useQuery({
    queryKey: queryKeys.workLineage.all,
    queryFn: workLineageApi.getLineage,
    refetchInterval: 10000,
  });

  return { lineageQuery };
}
