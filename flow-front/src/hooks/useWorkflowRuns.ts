import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowRunsApi, reportsApi } from '@/api/workflow-runs';
import { queryKeys } from '@/lib/query-keys';
import type { EditWorkNodeConfigRequest, AddWorkNodeRequest, StartWorkflowRunRequest } from '@/api/types';

export function useWorkflowRunList() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.workflowRuns.all,
    queryFn: () => workflowRunsApi.list(),
    refetchInterval: (query) => (query.state.status === 'error' ? false : 3000),
    retry: 1,
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.workflowRuns.summary,
    queryFn: () => workflowRunsApi.getSummary(),
    refetchInterval: (query) => (query.state.status === 'error' ? false : 3000),
    retry: 1,
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => workflowRunsApi.pause(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.summary });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: ({ id, checkpointId }: { id: string; checkpointId?: string }) =>
      workflowRunsApi.resume(id, checkpointId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.summary });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      workflowRunsApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.summary });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowRunsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.summary });
    },
  });

  return {
    listQuery,
    summaryQuery,
    pauseMutation,
    resumeMutation,
    cancelMutation,
    deleteMutation,
  };
}

export function useWorkflowRunDetail(id: string) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: queryKeys.workflowRuns.detail(id),
    queryFn: () => workflowRunsApi.getDetail(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 3000;
      if (status === 'COMPLETED' || status === 'CANCELLED') return false;
      if (status === 'RUNNING') return 2000;
      return 5000;
    },
  });

  const checkpointsQuery = useQuery({
    queryKey: queryKeys.workflowRuns.checkpoints(id),
    queryFn: () => workflowRunsApi.getCheckpoints(id),
    enabled:
      detailQuery.data?.status === 'PAUSED'
      || detailQuery.data?.status === 'AWAITING'
      || detailQuery.data?.status === 'COMPLETED'
      || detailQuery.data?.status === 'CANCELLED',
  });

  const pauseMutation = useMutation({
    mutationFn: () => workflowRunsApi.pause(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
      setTimeout(() => {
        void queryClient.refetchQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
      }, 800);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (checkpointId?: string) => workflowRunsApi.resume(id, checkpointId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
      setTimeout(() => {
        void queryClient.refetchQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
      }, 800);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => workflowRunsApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
      setTimeout(() => {
        void queryClient.refetchQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
      }, 800);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (checkpointId: string) => workflowRunsApi.restore(id, checkpointId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.checkpoints(id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => workflowRunsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.all });
    },
  });

  const editWorkNodeMutation = useMutation({
    mutationFn: ({
      sequence,
      config,
    }: {
      sequence: number;
      config: EditWorkNodeConfigRequest;
    }) => workflowRunsApi.editWorkNode(id, sequence, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
    },
  });

  const addWorkNodeMutation = useMutation({
    mutationFn: (config: AddWorkNodeRequest) => workflowRunsApi.addWorkNode(id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
    },
  });

  const deleteWorkNodeMutation = useMutation({
    mutationFn: (sequence: number) => workflowRunsApi.deleteWorkNode(id, sequence),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
    },
  });

  const startNewRunMutation = useMutation({
    mutationFn: (data: StartWorkflowRunRequest) => workflowRunsApi.start(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.all });
    },
  });

  const pushMutation = useMutation({
    mutationFn: () => workflowRunsApi.pushBranches(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
    },
  });

  return {
    detailQuery,
    checkpointsQuery,
    pauseMutation,
    resumeMutation,
    restoreMutation,
    cancelMutation,
    deleteMutation,
    editWorkNodeMutation,
    addWorkNodeMutation,
    deleteWorkNodeMutation,
    startNewRunMutation,
    pushMutation,
  };
}

export function useReport(workExecutionId: string, isRunning = false) {
  return useQuery({
    queryKey: queryKeys.workflowRuns.report(workExecutionId),
    queryFn: () => reportsApi.get(workExecutionId),
    enabled: !!workExecutionId,
    refetchInterval: isRunning ? 5000 : false,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useWorkflowRunWorkspace(runId: string) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const treeQuery = useQuery({
    queryKey: queryKeys.workflowRuns.workspaceTree(runId),
    queryFn: () => workflowRunsApi.getWorkspaceTree(runId),
  });

  const fileContentQuery = useQuery({
    queryKey: queryKeys.workflowRuns.workspaceFile(runId, selectedFilePath ?? ''),
    queryFn: () => workflowRunsApi.getWorkspaceFile(runId, selectedFilePath!),
    enabled: selectedFilePath !== null,
  });

  return { treeQuery, fileContentQuery, selectedFilePath, setSelectedFilePath };
}
