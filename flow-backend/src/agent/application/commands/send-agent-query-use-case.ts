import { Injectable } from '@nestjs/common';
import { AgentSessionRepository } from '../../domain/ports/agent-session-repository.js';
import { AgentClient } from '../../domain/ports/agent-client.js';
import type { QueryResult } from '../../domain/value-objects/index.js';
import type { WorkExecutionId } from '@common/ids/index.js';
import { AgentSessionNotFoundError } from '../errors/index.js';

export interface SendAgentQueryCommand {
  readonly workExecutionId: WorkExecutionId;
  readonly query: string;
}

@Injectable()
export class SendAgentQueryUseCase {
  constructor(
    private readonly agentSessionRepository: AgentSessionRepository,
    private readonly agentClient: AgentClient,
  ) {}

  async execute(command: SendAgentQueryCommand): Promise<QueryResult> {
    const session = await this.agentSessionRepository.findByWorkExecutionId(command.workExecutionId);
    if (!session || !session.sessionId) {
      throw new AgentSessionNotFoundError(command.workExecutionId);
    }

    return this.agentClient.sendQuery(session.sessionId, command.query);
  }
}
