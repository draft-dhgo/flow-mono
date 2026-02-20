import { EntitySchema } from 'typeorm';

export interface WorkflowSpaceRow {
  id: string;
  workflow_run_id: string;
  path: string;
  work_spaces: unknown;
  version: number;
}

export const WorkflowSpaceSchema = new EntitySchema<WorkflowSpaceRow>({
  name: 'workflow_space',
  tableName: 'workflow_spaces',
  columns: {
    id: { type: 'uuid', primary: true },
    workflow_run_id: { type: 'uuid' },
    path: { type: 'varchar', length: 500 },
    work_spaces: { type: 'jsonb', default: '[]' },
    version: { type: 'int', default: 0 },
  },
});
