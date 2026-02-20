import { EntitySchema } from 'typeorm';

export interface ReportRow {
  id: string;
  task_execution_id: string;
  work_execution_id: string;
  workflow_run_id: string;
  outline: unknown;
  file_path: string | null;
  content: string | null;
  status: string;
  error_message: string | null;
  version: number;
}

export const ReportSchema = new EntitySchema<ReportRow>({
  name: 'report',
  tableName: 'reports',
  columns: {
    id: { type: 'uuid', primary: true },
    task_execution_id: { type: 'uuid' },
    work_execution_id: { type: 'uuid' },
    workflow_run_id: { type: 'uuid' },
    outline: { type: 'jsonb' },
    file_path: { type: 'varchar', length: 500, nullable: true },
    content: { type: 'text', nullable: true },
    status: { type: 'varchar', length: 20 },
    error_message: { type: 'text', nullable: true },
    version: { type: 'int', default: 0 },
  },
});
