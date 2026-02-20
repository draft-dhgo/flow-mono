import { EntitySchema } from 'typeorm';

export interface WorkflowRow {
  id: string;
  name: string;
  description: string;
  branch_strategy: unknown;
  git_refs: unknown;
  mcp_server_refs: unknown;
  seed_keys: unknown;
  work_definitions: unknown;
  status: string;
  version: number;
}

export const WorkflowSchema = new EntitySchema<WorkflowRow>({
  name: 'workflow',
  tableName: 'workflows',
  columns: {
    id: { type: 'uuid', primary: true },
    name: { type: 'varchar', length: 255 },
    description: { type: 'text', default: '' },
    branch_strategy: { type: 'jsonb' },
    git_refs: { type: 'jsonb', default: '[]' },
    mcp_server_refs: { type: 'jsonb', default: '[]' },
    seed_keys: { type: 'jsonb', default: '[]' },
    work_definitions: { type: 'jsonb', default: '[]' },
    status: { type: 'varchar', length: 20, default: "'DRAFT'" },
    version: { type: 'int', default: 0 },
  },
});
