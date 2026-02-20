import { EntitySchema } from 'typeorm';

export interface AgentLogRow {
  id: string;
  work_execution_id: string | null;
  entry_type: string;
  content: unknown;
  created_at: Date;
}

export const AgentLogSchema = new EntitySchema<AgentLogRow>({
  name: 'agent_log',
  tableName: 'agent_logs',
  columns: {
    id: { type: 'uuid', primary: true },
    work_execution_id: { type: 'uuid', nullable: true },
    entry_type: { type: 'varchar', length: 50 },
    content: { type: 'jsonb', default: '{}' },
    created_at: { type: 'timestamptz' },
  },
});
