import type { AgentLogEntry } from '../agent-log-entry.js';

export abstract class AgentLogRepository {
  abstract save(entry: AgentLogEntry): Promise<void>;
  abstract saveAll(entries: AgentLogEntry[]): Promise<void>;
  abstract findByWorkExecutionId(workExecutionId: string): Promise<AgentLogEntry[]>;
}
