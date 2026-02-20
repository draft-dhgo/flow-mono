import { Injectable } from '@nestjs/common';
import { AgentSessionRepository } from '../../domain/ports/agent-session-repository.js';
import { AgentClient } from '../../domain/ports/agent-client.js';
import { EventPublisher } from '@common/ports/index.js';
import type { WorkExecutionId } from '@common/ids/index.js';
import { AgentSessionStopped } from '@common/events/index.js';
import { AgentSessionNotFoundError } from '../errors/index.js';

export interface StopAgentSessionCommand {
  readonly workExecutionId: WorkExecutionId;
}

@Injectable()
export class StopAgentSessionUseCase {
  constructor(
    private readonly agentSessionRepository: AgentSessionRepository,
    private readonly agentClient: AgentClient,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: StopAgentSessionCommand): Promise<void> {
    const session = await this.agentSessionRepository.findByWorkExecutionId(command.workExecutionId);
    if (!session) {
      throw new AgentSessionNotFoundError(command.workExecutionId);
    }

    if (session.sessionId) {
      await this.agentClient.stop(session.sessionId);
    }

    await this.agentSessionRepository.delete(session.id);

    await this.eventPublisher.publishAll([
      new AgentSessionStopped({
        agentSessionId: session.id,
        workExecutionId: session.workExecutionId,
        workflowRunId: session.workflowRunId,
      }),
    ]);
  }
}
