import type { McpServerConfig } from '../value-objects/index.js';
import type { QueryResult } from '../value-objects/index.js';

export interface AgentStartOptions {
  model: string;
  workspacePath: string;
  mcpServerConfigs: McpServerConfig[];
  systemPrompt?: string;
  allowedTools?: string[];
  maxTurns?: number;
  permissionMode?: string;
}

export interface AgentSessionHandle {
  sessionId: string;
  processId: string;
}

export abstract class AgentClient {
  abstract start(options: AgentStartOptions): Promise<AgentSessionHandle>;
  abstract stop(sessionId: string): Promise<void>;
  abstract sendQuery(sessionId: string, query: string): Promise<QueryResult>;
  abstract isRunning(sessionId: string): Promise<boolean>;
}
