import { Injectable } from '@nestjs/common';
import { AgentSession } from '../../domain/entities/agent-session.js';
import { AgentSessionRepository } from '../../domain/ports/agent-session-repository.js';
import { AgentClient } from '../../domain/ports/agent-client.js';
import type { AgentSessionHandle } from '../../domain/ports/agent-client.js';
import type { McpServerConfig } from '../../domain/value-objects/index.js';
import { EventPublisher } from '@common/ports/index.js';
import type { WorkExecutionId, WorkflowRunId } from '@common/ids/index.js';
import { AgentSessionStarted } from '@common/events/index.js';
import { AgentSessionCreationError } from '../errors/index.js';

export interface StartAgentSessionCommand {
  readonly workExecutionId: WorkExecutionId;
  readonly workflowRunId: WorkflowRunId;
  readonly model: string;
  readonly workspacePath: string;
  readonly mcpServerConfigs: McpServerConfig[];
}

@Injectable()
export class StartAgentSessionUseCase {
  constructor(
    private readonly agentSessionRepository: AgentSessionRepository,
    private readonly agentClient: AgentClient,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: StartAgentSessionCommand): Promise<{ agentSessionId: string }> {
    const session = AgentSession.create({
      workExecutionId: command.workExecutionId,
      workflowRunId: command.workflowRunId,
      model: command.model,
      workspacePath: command.workspacePath,
      mcpServerConfigs: command.mcpServerConfigs,
    });

    let handle: AgentSessionHandle;
    try {
      handle = await this.agentClient.start({
        model: command.model,
        workspacePath: command.workspacePath,
        mcpServerConfigs: command.mcpServerConfigs,
      });
    } catch (error) {
      throw new AgentSessionCreationError(
        error instanceof Error ? error.message : String(error),
      );
    }

    session.assignSession(handle);

    await this.agentSessionRepository.save(session);

    const events = session.clearDomainEvents();
    events.push(
      new AgentSessionStarted({
        agentSessionId: session.id,
        workExecutionId: command.workExecutionId,
        workflowRunId: command.workflowRunId,
        processId: handle.processId,
      }),
    );
    await this.eventPublisher.publishAll(events);

    return { agentSessionId: session.id };
  }
}
