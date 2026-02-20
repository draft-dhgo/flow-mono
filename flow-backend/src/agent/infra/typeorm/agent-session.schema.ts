import { EntitySchema } from 'typeorm';

export interface AgentSessionRow {
  id: string;
  work_execution_id: string;
  workflow_run_id: string;
  model: string;
  workspace_path: string;
  mcp_server_configs: unknown;
  process_id: string | null;
  session_id: string | null;
  version: number;
}

export const AgentSessionSchema = new EntitySchema<AgentSessionRow>({
  name: 'agent_session',
  tableName: 'agent_sessions',
  columns: {
    id: { type: 'uuid', primary: true },
    work_execution_id: { type: 'uuid' },
    workflow_run_id: { type: 'uuid' },
    model: { type: 'varchar', length: 100 },
    workspace_path: { type: 'varchar', length: 500 },
    mcp_server_configs: { type: 'jsonb', default: '[]' },
    process_id: { type: 'varchar', length: 255, nullable: true },
    session_id: { type: 'varchar', length: 255, nullable: true },
    version: { type: 'int', default: 0 },
  },
});
