import { v4 as uuidv4 } from 'uuid';
import { AgentService } from '@common/ports/index.js';
import type {
  AgentSessionInfo,
  StartAgentSessionOptions,
  StartWorkspaceSessionOptions,
  QueryResult,
} from '@common/ports/index.js';
import type { WorkExecutionId } from '@common/ids/index.js';

export class InMemoryAgentService extends AgentService {
  private readonly sessions = new Map<string, AgentSessionInfo>();

  async startSession(options: StartAgentSessionOptions): Promise<AgentSessionInfo> {
    const sessionInfo: AgentSessionInfo = {
      sessionId: uuidv4(),
      processId: uuidv4(),
      isAssigned: true,
    };
    this.sessions.set(options.workExecutionId, sessionInfo);
    return sessionInfo;
  }

  async stopSession(workExecutionId: WorkExecutionId): Promise<void> {
    this.sessions.delete(workExecutionId);
  }

  async deleteSession(workExecutionId: WorkExecutionId): Promise<void> {
    this.sessions.delete(workExecutionId);
  }

  async sendQuery(workExecutionId: WorkExecutionId, query: string): Promise<QueryResult> {
    return {
      response: `Mock response for query: ${query}`,
      tokensUsed: query.length,
    };
  }

  async findSessionByWorkExecutionId(workExecutionId: WorkExecutionId): Promise<AgentSessionInfo | null> {
    return this.sessions.get(workExecutionId) ?? null;
  }

  async startSessionForWorkspace(options: StartWorkspaceSessionOptions): Promise<AgentSessionInfo> {
    const sessionInfo: AgentSessionInfo = {
      sessionId: uuidv4(),
      processId: uuidv4(),
      isAssigned: true,
    };
    this.sessions.set(options.workspaceId, sessionInfo);
    return sessionInfo;
  }

  async sendQueryForWorkspace(workspaceId: string, query: string): Promise<QueryResult> {
    return {
      response: `Mock response for workspace query: ${query}`,
      tokensUsed: query.length,
    };
  }

  async stopSessionForWorkspace(workspaceId: string): Promise<void> {
    this.sessions.delete(workspaceId);
  }
}
