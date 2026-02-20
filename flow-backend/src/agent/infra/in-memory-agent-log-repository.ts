import { Injectable } from '@nestjs/common';
import type { AgentLogEntry } from '../application/agent-log-entry.js';
import { AgentLogRepository } from '../application/ports/agent-log-repository.js';

@Injectable()
export class InMemoryAgentLogRepository extends AgentLogRepository {
  private readonly entries: AgentLogEntry[] = [];

  async save(entry: AgentLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  async saveAll(entries: AgentLogEntry[]): Promise<void> {
    this.entries.push(...entries);
  }

  async findByWorkExecutionId(workExecutionId: string): Promise<AgentLogEntry[]> {
    return this.entries
      .filter((e) => e.workExecutionId === workExecutionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}
