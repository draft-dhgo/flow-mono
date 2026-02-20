import { EntitySchema } from 'typeorm';

export interface WorkflowRunRow {
  id: string;
  workflow_id: string;
  issue_key: string;
  seed_values: unknown;
  status: string;
  current_work_index: number;
  cancelled_at_work_index: number | null;
  cancellation_reason: string | null;
  work_execution_ids: unknown;
  git_ref_pool: unknown;
  mcp_server_ref_pool: unknown;
  work_node_configs: unknown;
  restored_to_checkpoint: boolean;
  version: number;
}

export const WorkflowRunSchema = new EntitySchema<WorkflowRunRow>({
  name: 'workflow_run',
  tableName: 'workflow_runs',
  columns: {
    id: { type: 'uuid', primary: true },
    workflow_id: { type: 'uuid' },
    issue_key: { type: 'varchar', length: 50 },
    seed_values: { type: 'jsonb', default: '{}' },
    status: { type: 'varchar', length: 20 },
    current_work_index: { type: 'int', default: 0 },
    cancelled_at_work_index: { type: 'int', nullable: true },
    cancellation_reason: { type: 'text', nullable: true },
    work_execution_ids: { type: 'jsonb', default: '[]' },
    git_ref_pool: { type: 'jsonb', default: '[]' },
    mcp_server_ref_pool: { type: 'jsonb', default: '[]' },
    work_node_configs: { type: 'jsonb', default: '[]' },
    restored_to_checkpoint: { type: 'boolean', default: false },
    version: { type: 'int', default: 0 },
  },
});
