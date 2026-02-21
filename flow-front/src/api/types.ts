// ─── Enums ───

export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | string;

export type WorkflowRunStatus =
  | 'INITIALIZED'
  | 'RUNNING'
  | 'PAUSED'
  | 'AWAITING'
  | 'COMPLETED'
  | 'CANCELLED';

export type McpTransportType = 'STDIO' | 'SSE' | 'STREAMABLE_HTTP';

// ─── Error ───

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

// ─── Dashboard Summary ───

export interface RunSummary {
  running: number;
  paused: number;
  awaiting: number;
  completed: number;
  cancelled: number;
  initialized: number;
}

// ─── Git ───

export interface GitResponse {
  id: string;
  url: string;
  localPath: string;
}

export interface CreateGitRequest {
  url: string;
  localPath: string;
}

// ─── MCP Server ───

export interface McpServerResponse {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  transportType: McpTransportType;
  url: string | null;
}

export interface RegisterMcpServerRequest {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  transportType: McpTransportType;
  url?: string | null;
}

// ─── Workflow ───

export interface GitRefInput {
  gitId: string;
  baseBranch: string;
}

export interface McpServerRefInput {
  mcpServerId: string;
  envOverrides?: Record<string, string>;
}

export interface SectionInput {
  title: string;
  description: string;
}

export interface ReportOutlineInput {
  sections: SectionInput[];
}

export interface TaskDefinitionInput {
  order: number;
  query: string;
  reportOutline?: ReportOutlineInput;
}

export interface WorkDefinitionInput {
  order: number;
  model: string;
  pauseAfter?: boolean;
  gitRefs?: GitRefInput[];
  mcpServerRefs?: McpServerRefInput[];
  taskDefinitions: TaskDefinitionInput[];
  reportFileRefs?: number[];
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  branchStrategy: string;
  gitRefs?: GitRefInput[];
  mcpServerRefs?: McpServerRefInput[];
  workDefinitions: WorkDefinitionInput[];
  seedKeys?: string[];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  workDefinitions?: WorkDefinitionInput[];
  gitRefs?: GitRefInput[];
  mcpServerRefs?: McpServerRefInput[];
  seedKeys?: string[];
}

export interface WorkflowResponse {
  id: string;
  name: string;
  description: string;
  branchStrategy: string;
  status: WorkflowStatus;
  gitRefs: { gitId: string; baseBranch: string; valid: boolean }[];
  mcpServerRefs: { mcpServerId: string; envOverrides: Record<string, string>; valid: boolean }[];
  seedKeys: string[];
  workDefinitions: {
    order: number;
    model: string;
    pauseAfter: boolean;
    reportFileRefs: number[];
    gitRefs: { gitId: string; baseBranch: string; valid: boolean }[];
    mcpServerRefs: { mcpServerId: string; envOverrides: Record<string, string>; valid: boolean }[];
    taskDefinitions: {
      order: number;
      query: string;
      reportOutline: { sections: { title: string; description: string }[] } | null;
    }[];
  }[];
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  branchStrategy: string;
  gitRefCount: number;
  mcpServerRefCount: number;
  workDefinitionCount: number;
  seedKeys: string[];
  gitRefs: { gitId: string; baseBranch: string; valid: boolean }[];
  mcpServerRefs: { mcpServerId: string; envOverrides: Record<string, string>; valid: boolean }[];
}

// ─── Workflow Run ───

export interface WorkflowRunDetailResponse {
  id: string;
  workflowId: string;
  issueKey: string;
  status: WorkflowRunStatus;
  currentWorkIndex: number;
  totalWorkCount: number;
  cancelledAtWorkIndex: number | null;
  cancellationReason: string | null;
  restoredToCheckpoint: boolean;
  seedValues?: Record<string, string>;
  seedKeys?: string[];
  workExecutionIds?: string[];
  gitRefPool: { gitId: string; baseBranch: string }[];
  mcpServerRefPool: { mcpServerId: string; envOverrides: Record<string, string> }[];
  workNodeConfigs?: WorkNodeConfigSummary[];
}

export interface WorkNodeConfigSummary {
  id: string;
  sequence: number;
  model: string;
  taskCount: number;
  pauseAfter: boolean;
  reportFileRefs: number[];
  gitRefConfigs: { gitId: string; baseBranch: string }[];
  mcpServerRefConfigs: { mcpServerId: string; envOverrides: Record<string, string> }[];
  taskConfigs: TaskNodeConfigInput[];
}

export interface WorkflowRunListItem {
  id: string;
  workflowId: string;
  workflowName: string;
  issueKey: string;
  status: WorkflowRunStatus;
  currentWorkIndex: number;
  totalWorkCount: number;
  createdAt: string;
}

export interface CheckpointResponse {
  id: string;
  workflowRunId: string;
  workflowId: string;
  workExecutionId: string;
  workSequence: number;
  createdAt: string;
}

export interface TaskNodeConfigInput {
  order: number;
  query: string;
  hasReportOutline?: boolean;
}

export interface GitRefNodeConfigInput {
  gitId: string;
  baseBranch: string;
}

export interface McpServerRefNodeConfigInput {
  mcpServerId: string;
  envOverrides?: Record<string, string>;
}

export interface EditWorkNodeConfigRequest {
  model?: string;
  taskConfigs?: TaskNodeConfigInput[];
  pauseAfter?: boolean;
  gitRefConfigs?: GitRefNodeConfigInput[];
  mcpServerRefConfigs?: McpServerRefNodeConfigInput[];
  reportFileRefs?: number[];
}

export interface AddWorkNodeRequest {
  model: string;
  taskConfigs: TaskNodeConfigInput[];
  pauseAfter?: boolean;
  gitRefConfigs?: GitRefNodeConfigInput[];
  mcpServerRefConfigs?: McpServerRefNodeConfigInput[];
  reportFileRefs?: number[];
}

export interface StartWorkflowRunRequest {
  workflowId: string;
  issueKey: string;
  seedValues?: Record<string, string>;
}

export interface ResumeWorkflowRunRequest {
  checkpointId?: string;
}

export interface CancelWorkflowRunRequest {
  reason?: string;
}

// ─── Agent Log ───

export type AgentLogEntryType =
  | 'system_init'
  | 'assistant_text'
  | 'tool_use'
  | 'tool_result'
  | 'result_summary'
  | 'error';

export interface AgentLogEntryContent {
  text?: string;
  toolName?: string;
  toolInput?: string;
  durationMs?: number;
  totalCostUsd?: number;
  numTurns?: number;
  usage?: { inputTokens: number; outputTokens: number };
  errorMessage?: string;
}

export interface AgentLogEntryResponse {
  id: string;
  workExecutionId: string;
  entryType: AgentLogEntryType;
  content: AgentLogEntryContent;
  createdAt: string;
}

// ─── Workspace ───

export type WorkspaceStatus = 'ACTIVE' | 'COMPLETED';

export interface WorkspaceGitRefResponse {
  gitId: string;
  gitUrl: string;
  baseBranch: string;
  branchName: string;
}

export interface WorkspaceDetailResponse {
  id: string;
  name: string;
  status: WorkspaceStatus;
  model: string;
  path: string;
  purpose: string;
  agentSessionId: string | null;
  createdAt: string;
  gitRefs: WorkspaceGitRefResponse[];
  mcpServerRefs: { mcpServerId: string; envOverrides: Record<string, string> }[];
}

export interface WorkspaceListItem {
  id: string;
  name: string;
  status: WorkspaceStatus;
  model: string;
  purpose: string;
  gitRefCount: number;
  createdAt: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  model: string;
  gitRefs: { gitId: string; baseBranch: string; branchName: string }[];
  mcpServerRefs?: { mcpServerId: string; envOverrides?: Record<string, string> }[];
  purpose?: 'GENERAL' | 'WORKFLOW_BUILDER';
}

export interface SendChatMessageRequest {
  message: string;
}

export interface ChatMessageResponse {
  response: string;
}

export interface DiffFileInfo {
  path: string;
  original: string;
  modified: string;
}

export interface FileTreeEntry {
  path: string;
  isDirectory: boolean;
  size: number;
}

export interface WorkspaceFileContent {
  content: string;
  path: string;
}

// ─── Auth ───

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// ─── Push ───

export interface PushResult {
  gitId: string;
  branch: string;
  success: boolean;
  error: string | null;
}

export interface PushBranchesResult {
  results: PushResult[];
}

// ─── Merge ───

export interface MergeBranchesRequest {
  workflowRunIds: string[];
}

export interface MergeBranchesResponse {
  response: string;
}

// ─── Work Lineage ───

export interface WorkLineageRepoInfo {
  gitId: string;
  gitUrl: string;
  branch: string;
  commitHash: string;
  commitCount: number;
}

export interface WorkLineageRunInfo {
  workflowRunId: string;
  workflowName: string;
  runStatus: string;
  repos: WorkLineageRepoInfo[];
}

export interface WorkLineageEntry {
  issueKey: string;
  runs: WorkLineageRunInfo[];
}

// ─── Workflow Builder ───

export interface TaskDefinitionPreview {
  order: number;
  query: string;
  reportOutline: { sections: { title: string; description: string }[] } | null;
}

export interface WorkDefinitionPreview {
  order: number;
  model: string;
  pauseAfter: boolean;
  reportFileRefs: number[];
  taskDefinitions: TaskDefinitionPreview[];
}

export interface WorkflowPreview {
  name: string;
  description: string;
  branchStrategy: string;
  gitRefs: { gitId: string; baseBranch: string }[];
  mcpServerRefs: { mcpServerId: string; envOverrides: Record<string, string> }[];
  seedKeys: string[];
  workDefinitions: WorkDefinitionPreview[];
}

export interface BuildWorkflowResponse {
  workflowId: string;
}
