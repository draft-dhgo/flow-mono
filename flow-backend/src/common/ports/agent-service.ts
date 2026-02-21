import type { WorkExecutionId, WorkflowRunId } from '../ids/index.js';

export interface McpServerConfig {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly transportType: string;
  readonly url: string | null;
}

export interface QueryResult {
  readonly response: string;
  readonly tokensUsed?: number;
}

export interface AgentSessionInfo {
  readonly sessionId: string;
  readonly processId: string | null;
  readonly isAssigned: boolean;
}

export interface StartAgentSessionOptions {
  readonly workExecutionId: WorkExecutionId;
  readonly workflowRunId: WorkflowRunId;
  readonly model: string;
  readonly workspacePath: string;
  readonly mcpServerConfigs: McpServerConfig[];
}

export interface StartWorkspaceSessionOptions {
  readonly workspaceId: string;
  readonly model: string;
  readonly workspacePath: string;
  readonly mcpServerConfigs: McpServerConfig[];
  readonly systemPrompt?: string;
}

export abstract class AgentService {
  abstract startSession(options: StartAgentSessionOptions): Promise<AgentSessionInfo>;
  abstract stopSession(workExecutionId: WorkExecutionId): Promise<void>;
  abstract deleteSession(workExecutionId: WorkExecutionId): Promise<void>;
  abstract sendQuery(workExecutionId: WorkExecutionId, query: string): Promise<QueryResult>;
  abstract findSessionByWorkExecutionId(workExecutionId: WorkExecutionId): Promise<AgentSessionInfo | null>;
  abstract startSessionForWorkspace(options: StartWorkspaceSessionOptions): Promise<AgentSessionInfo>;
  abstract sendQueryForWorkspace(workspaceId: string, query: string): Promise<QueryResult>;
  abstract stopSessionForWorkspace(workspaceId: string): Promise<void>;
}
