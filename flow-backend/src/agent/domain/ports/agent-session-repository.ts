import type { AgentSession } from '../entities/agent-session.js';
import type { AgentSessionId } from '../value-objects/index.js';
import type { WorkExecutionId } from '@common/ids/index.js';

export abstract class AgentSessionRepository {
  abstract findById(id: AgentSessionId): Promise<AgentSession | null>;
  abstract findByWorkExecutionId(workExecutionId: WorkExecutionId): Promise<AgentSession | null>;
  abstract save(session: AgentSession): Promise<void>;
  abstract delete(id: AgentSessionId): Promise<void>;
  abstract exists(id: AgentSessionId): Promise<boolean>;
}
