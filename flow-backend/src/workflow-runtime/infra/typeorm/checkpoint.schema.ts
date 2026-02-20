import { EntitySchema } from 'typeorm';

export interface CheckpointRow {
  id: string;
  workflow_run_id: string;
  workflow_id: string;
  work_execution_id: string;
  work_sequence: number;
  commit_hashes: unknown;
  created_at: Date;
  version: number;
}

export const CheckpointSchema = new EntitySchema<CheckpointRow>({
  name: 'checkpoint',
  tableName: 'checkpoints',
  columns: {
    id: { type: 'uuid', primary: true },
    workflow_run_id: { type: 'uuid' },
    workflow_id: { type: 'uuid' },
    work_execution_id: { type: 'uuid' },
    work_sequence: { type: 'int' },
    commit_hashes: { type: 'jsonb' },
    created_at: { type: 'timestamp with time zone' },
    version: { type: 'int', default: 0 },
  },
});
