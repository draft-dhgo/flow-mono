import { EntitySchema } from 'typeorm';

export interface WorkTreeRow {
  id: string;
  git_id: string;
  workflow_run_id: string;
  path: string;
  branch: string;
  version: number;
}

export const WorkTreeSchema = new EntitySchema<WorkTreeRow>({
  name: 'work_tree',
  tableName: 'work_trees',
  columns: {
    id: { type: 'uuid', primary: true },
    git_id: { type: 'uuid' },
    workflow_run_id: { type: 'uuid' },
    path: { type: 'varchar', length: 500 },
    branch: { type: 'varchar', length: 255 },
    version: { type: 'int', default: 0 },
  },
});
