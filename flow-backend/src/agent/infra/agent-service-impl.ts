import { Injectable } from '@nestjs/common';
import { AgentService } from '@common/ports/index.js';
import type {
  AgentSessionInfo,
  StartAgentSessionOptions,
  StartWorkspaceSessionOptions,
  QueryResult,
} from '@common/ports/index.js';
import type { WorkExecutionId } from '@common/ids/index.js';
import { AgentClient } from '../domain/ports/agent-client.js';
import { AgentSessionRepository } from '../domain/ports/agent-session-repository.js';
import { AgentSession } from '../domain/entities/agent-session.js';
import type { AgentLogEmitter } from '../application/agent-log-emitter.js';
import { ClaudeAgentClient } from './claude-agent-client.js';

@Injectable()
export class AgentServiceImpl extends AgentService {
  constructor(
    private readonly agentClient: AgentClient,
    private readonly agentSessionRepository: AgentSessionRepository,
    private readonly agentLogEmitter: AgentLogEmitter | null = null,
  ) {
    super();
  }

  async startSession(options: StartAgentSessionOptions): Promise<AgentSessionInfo> {
    const session = AgentSession.create({
      workExecutionId: options.workExecutionId,
      workflowRunId: options.workflowRunId,
      model: options.model,
      workspacePath: options.workspacePath,
      mcpServerConfigs: [...options.mcpServerConfigs],
    });

    const handle = await this.agentClient.start({
      model: options.model,
      workspacePath: options.workspacePath,
      mcpServerConfigs: [...options.mcpServerConfigs],
      permissionMode: 'bypassPermissions',
    });

    session.assignSession(handle);
    await this.agentSessionRepository.save(session);

    // Flush buffered logs from start() and tag them with workExecutionId
    if (this.agentLogEmitter) {
      await this.agentLogEmitter.tagAndFlush(handle.sessionId, options.workExecutionId);
    }

    // Set workExecutionId on client for direct emission in sendQuery
    if (this.agentClient instanceof ClaudeAgentClient) {
      this.agentClient.setWorkExecutionId(handle.sessionId, options.workExecutionId);
    }

    return {
      sessionId: handle.sessionId,
      processId: handle.processId,
      isAssigned: true,
    };
  }

  async stopSession(workExecutionId: WorkExecutionId): Promise<void> {
    const session = await this.agentSessionRepository.findByWorkExecutionId(workExecutionId);
    if (session?.sessionId) {
      await this.agentClient.stop(session.sessionId);
    }
    if (session) {
      await this.agentSessionRepository.delete(session.id);
    }
  }

  async deleteSession(workExecutionId: WorkExecutionId): Promise<void> {
    const session = await this.agentSessionRepository.findByWorkExecutionId(workExecutionId);
    if (session) {
      await this.agentSessionRepository.delete(session.id);
    }
  }

  async sendQuery(workExecutionId: WorkExecutionId, query: string): Promise<QueryResult> {
    const session = await this.agentSessionRepository.findByWorkExecutionId(workExecutionId);
    if (!session?.sessionId) {
      throw new Error(`No agent session found for work execution ${workExecutionId}`);
    }
    return this.agentClient.sendQuery(session.sessionId, query);
  }

  async findSessionByWorkExecutionId(workExecutionId: WorkExecutionId): Promise<AgentSessionInfo | null> {
    const session = await this.agentSessionRepository.findByWorkExecutionId(workExecutionId);
    if (!session) {
      return null;
    }
    return {
      sessionId: session.sessionId ?? '',
      processId: session.processId,
      isAssigned: session.isAssigned,
    };
  }

  // Workspace session methods — separate map for workspace↔session mapping
  private readonly workspaceSessions = new Map<string, string>();

  async startSessionForWorkspace(options: StartWorkspaceSessionOptions): Promise<AgentSessionInfo> {
    const handle = await this.agentClient.start({
      model: options.model,
      workspacePath: options.workspacePath,
      mcpServerConfigs: [...options.mcpServerConfigs],
      systemPrompt: options.systemPrompt,
      permissionMode: 'bypassPermissions',
    });

    this.workspaceSessions.set(options.workspaceId, handle.sessionId);

    // Flush buffered logs from start() with workspaceId as key
    if (this.agentLogEmitter) {
      await this.agentLogEmitter.tagAndFlush(handle.sessionId, options.workspaceId);
    }

    // Set workExecutionId on client so future sendQuery logs are emitted directly
    if (this.agentClient instanceof ClaudeAgentClient) {
      this.agentClient.setWorkExecutionId(handle.sessionId, options.workspaceId);
    }

    return {
      sessionId: handle.sessionId,
      processId: handle.processId,
      isAssigned: true,
    };
  }

  async sendQueryForWorkspace(workspaceId: string, query: string): Promise<QueryResult> {
    const sessionId = this.workspaceSessions.get(workspaceId);
    if (!sessionId) {
      throw new Error(`No agent session found for workspace ${workspaceId}`);
    }
    return this.agentClient.sendQuery(sessionId, query);
  }

  async stopSessionForWorkspace(workspaceId: string): Promise<void> {
    const sessionId = this.workspaceSessions.get(workspaceId);
    if (sessionId) {
      await this.agentClient.stop(sessionId);
      this.workspaceSessions.delete(workspaceId);
    }
  }
}
