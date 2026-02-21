import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspacesApi } from '@/api/workspaces';
import { queryKeys } from '@/lib/query-keys';
import type { CreateWorkspaceRequest, WorkspaceDetailResponse } from '@/api/types';

export function useWorkspaceList() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.workspaces.all,
    queryFn: () => workspacesApi.list(),
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workspacesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkspaceRequest) => workspacesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });

  return { listQuery, deleteMutation, createMutation };
}

export function useWorkspaceDetail(id: string | undefined) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: queryKeys.workspaces.detail(id!),
    queryFn: () => workspacesApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as WorkspaceDetailResponse | undefined;
      if (data?.status === 'ACTIVE') return 2000;
      return false;
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => workspacesApi.complete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => workspacesApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) => workspacesApi.chat(id!, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.agentLogs(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.workflowPreview(id!) });
    },
  });

  const treeQuery = useQuery({
    queryKey: queryKeys.workspaces.tree(id!),
    queryFn: () => workspacesApi.tree(id!),
    enabled: !!id,
    refetchInterval: () => {
      const detail = queryClient.getQueryData(queryKeys.workspaces.detail(id!)) as
        | WorkspaceDetailResponse
        | undefined;
      if (detail?.status === 'ACTIVE') return 5000;
      return false;
    },
  });

  const agentLogsQuery = useQuery({
    queryKey: queryKeys.workspaces.agentLogs(id!),
    queryFn: () => workspacesApi.agentLogs(id!),
    enabled: !!id,
    refetchInterval: () => {
      const detail = queryClient.getQueryData(queryKeys.workspaces.detail(id!)) as
        | WorkspaceDetailResponse
        | undefined;
      if (detail?.status === 'ACTIVE') return 3000;
      return false;
    },
  });

  const pushMutation = useMutation({
    mutationFn: () => workspacesApi.pushBranches(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(id!) });
    },
  });

  const isBuilder = detailQuery.data?.purpose === 'WORKFLOW_BUILDER';
  const isActive = detailQuery.data?.status === 'ACTIVE';

  const workflowPreviewQuery = useQuery({
    queryKey: queryKeys.workspaces.workflowPreview(id!),
    queryFn: () => workspacesApi.getWorkflowPreview(id!),
    enabled: !!id && isBuilder,
    refetchInterval: isActive ? 3000 : false,
  });

  const buildWorkflowMutation = useMutation({
    mutationFn: () => workspacesApi.buildWorkflow(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(id!) });
    },
  });

  return {
    detailQuery,
    completeMutation,
    deleteMutation,
    chatMutation,
    treeQuery,
    agentLogsQuery,
    pushMutation,
    workflowPreviewQuery,
    buildWorkflowMutation,
  };
}

export function useWorkspaceDiff(id: string | undefined, gitId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.workspaces.diff(id!, gitId),
    queryFn: () => workspacesApi.diff(id!, gitId),
    enabled: !!id && enabled,
  });
}

export function useWorkspaceFile(id: string | undefined, filePath: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.workspaces.file(id!, filePath),
    queryFn: () => workspacesApi.file(id!, filePath),
    enabled: !!id && !!filePath && enabled,
  });
}
