import { useQuery } from '@tanstack/react-query';
import { agentLogsApi } from '@/api/workflow-runs';
import { queryKeys } from '@/lib/query-keys';

export function useAgentLogs(runId: string, workExecutionId: string, isRunning: boolean) {
  return useQuery({
    queryKey: queryKeys.agentLogs.byWorkExecution(runId, workExecutionId),
    queryFn: () => agentLogsApi.getAll(runId, workExecutionId),
    enabled: !!runId && !!workExecutionId,
    refetchInterval: isRunning ? 3000 : false,
  });
}
