import { Injectable } from '@nestjs/common';
import { AgentLogRepository } from '../ports/agent-log-repository.js';
import type { AgentLogReadModel } from './read-models.js';

@Injectable()
export class ListAgentLogsQuery {
  constructor(
    private readonly agentLogRepository: AgentLogRepository,
  ) {}

  async execute(params: { workExecutionId: string }): Promise<AgentLogReadModel[]> {
    const entries = await this.agentLogRepository.findByWorkExecutionId(params.workExecutionId);
    return entries.map((entry) => ({
      id: entry.id,
      workExecutionId: entry.workExecutionId,
      entryType: entry.entryType,
      content: entry.content,
      createdAt: entry.createdAt.toISOString(),
    }));
  }
}
