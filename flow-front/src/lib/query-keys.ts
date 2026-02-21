export const queryKeys = {
  workflows: {
    all: ['workflows'] as const,
    detail: (id: string) => ['workflows', id] as const,
  },
  gits: {
    all: ['gits'] as const,
  },
  mcpServers: {
    all: ['mcp-servers'] as const,
  },
  workflowRuns: {
    all: ['workflow-runs'] as const,
    detail: (id: string) => ['workflow-runs', id] as const,
    summary: ['workflow-runs', 'summary'] as const,
    checkpoints: (id: string) => ['workflow-runs', id, 'checkpoints'] as const,
    workspaceTree: (id: string) => ['workflow-runs', id, 'workspace-tree'] as const,
    workspaceFile: (id: string, filePath: string) => ['workflow-runs', id, 'workspace-file', filePath] as const,
  },
  agentLogs: {
    byWorkExecution: (runId: string, weId: string) => ['agent-logs', runId, weId] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  workspaces: {
    all: ['workspaces'] as const,
    detail: (id: string) => ['workspaces', id] as const,
    tree: (id: string) => ['workspaces', id, 'tree'] as const,
    file: (id: string, path: string) => ['workspaces', id, 'file', path] as const,
    diff: (id: string, gitId?: string) => ['workspaces', id, 'diff', gitId ?? 'default'] as const,
    agentLogs: (id: string) => ['workspaces', id, 'agent-logs'] as const,
    workflowPreview: (id: string) => ['workspaces', id, 'workflow-preview'] as const,
  },
  workLineage: {
    all: ['work-lineage'] as const,
    export: ['work-lineage', 'export'] as const,
  },
};
