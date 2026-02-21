import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowsApi } from '@/api/workflows';
import { workflowRunsApi } from '@/api/workflow-runs';
import { queryKeys } from '@/lib/query-keys';
import type { CreateWorkflowRequest, UpdateWorkflowRequest, StartWorkflowRunRequest } from '@/api/types';

export function useWorkflows() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.workflows.all,
    queryFn: () => workflowsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkflowRequest) => workflowsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkflowRequest }) =>
      workflowsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });

  const startRunMutation = useMutation({
    mutationFn: (data: StartWorkflowRunRequest) => workflowRunsApi.start(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.all });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => workflowsApi.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });

  return {
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    activateMutation,
    deactivateMutation,
    startRunMutation,
    bulkDeleteMutation,
  };
}

export function useWorkflowDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workflows.detail(id!),
    queryFn: () => workflowsApi.get(id!),
    enabled: !!id,
  });
}
