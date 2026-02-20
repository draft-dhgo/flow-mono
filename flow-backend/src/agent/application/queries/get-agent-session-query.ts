import { Injectable, Inject } from '@nestjs/common';
import { AgentSessionRepository } from '../../domain/ports/agent-session-repository.js';
import type { AgentSessionReadModel } from './read-models.js';
import type { WorkExecutionId } from '@common/ids/index.js';
import { ApplicationError } from '@common/errors/index.js';

@Injectable()
export class GetAgentSessionQuery {
  constructor(
    @Inject(AgentSessionRepository) private readonly agentSessionRepository: AgentSessionRepository,
  ) {}

  async execute(params: { workExecutionId: WorkExecutionId }): Promise<AgentSessionReadModel> {
    const session = await this.agentSessionRepository.findByWorkExecutionId(params.workExecutionId);
    if (!session) {
      throw new ApplicationError('AGENT_SESSION_NOT_FOUND', `AgentSession not found for workExecutionId: ${params.workExecutionId}`);
    }
    return {
      id: session.id,
      workExecutionId: session.workExecutionId,
      workflowRunId: session.workflowRunId,
      model: session.model,
      isAssigned: session.isAssigned,
    };
  }
}
