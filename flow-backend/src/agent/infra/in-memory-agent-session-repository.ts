import { Injectable } from '@nestjs/common';
import type { AgentSession } from '../domain/entities/agent-session.js';
import type { AgentSessionId } from '../domain/value-objects/index.js';
import type { WorkExecutionId } from '@common/ids/index.js';
import { AgentSessionRepository } from '../domain/ports/agent-session-repository.js';

@Injectable()
export class InMemoryAgentSessionRepository extends AgentSessionRepository {
  private readonly store = new Map<AgentSessionId, AgentSession>();

  async findById(id: AgentSessionId): Promise<AgentSession | null> {
    return this.store.get(id) ?? null;
  }

  async findByWorkExecutionId(workExecutionId: WorkExecutionId): Promise<AgentSession | null> {
    return [...this.store.values()].find((s) => s.workExecutionId === workExecutionId) ?? null;
  }

  async save(session: AgentSession): Promise<void> {
    this.store.set(session.id, session);
  }

  async delete(id: AgentSessionId): Promise<void> {
    this.store.delete(id);
  }

  async exists(id: AgentSessionId): Promise<boolean> {
    return this.store.has(id);
  }
}
