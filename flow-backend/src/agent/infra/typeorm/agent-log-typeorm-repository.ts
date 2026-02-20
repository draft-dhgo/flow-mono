import type { Repository } from 'typeorm';
import { AgentLogRepository } from '../../application/ports/agent-log-repository.js';
import type { AgentLogEntry, AgentLogEntryType, AgentLogEntryContent } from '../../application/agent-log-entry.js';
import type { AgentLogRow } from './agent-log.schema.js';

export class AgentLogTypeormRepository extends AgentLogRepository {
  constructor(private readonly repo: Repository<AgentLogRow>) {
    super();
  }

  private toDomain(row: AgentLogRow): AgentLogEntry {
    return {
      id: row.id,
      workExecutionId: row.work_execution_id,
      entryType: row.entry_type as AgentLogEntryType,
      content: row.content as AgentLogEntryContent,
      createdAt: row.created_at,
    };
  }

  private toRow(entry: AgentLogEntry): AgentLogRow {
    return {
      id: entry.id,
      work_execution_id: entry.workExecutionId,
      entry_type: entry.entryType,
      content: entry.content as unknown,
      created_at: entry.createdAt,
    };
  }

  async save(entry: AgentLogEntry): Promise<void> {
    const row = this.toRow(entry);
    await this.repo.save(row);
  }

  async saveAll(entries: AgentLogEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const rows = entries.map((e) => this.toRow(e));
    await this.repo.save(rows);
  }

  async findByWorkExecutionId(workExecutionId: string): Promise<AgentLogEntry[]> {
    const rows = await this.repo.find({
      where: { work_execution_id: workExecutionId },
      order: { created_at: 'ASC' },
    });
    return rows.map((r) => this.toDomain(r));
  }
}
