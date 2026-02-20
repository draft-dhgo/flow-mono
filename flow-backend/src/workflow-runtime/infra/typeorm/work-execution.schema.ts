import { EntitySchema } from 'typeorm';

export interface WorkExecutionRow {
  id: string;
  workflow_run_id: string;
  workflow_id: string;
  work_node_config_id: string;
  sequence: number;
  model: string;
  task_executions: unknown;
  current_task_index: number;
  is_completed: boolean;
  is_cancelled: boolean;
  version: number;
}

export const WorkExecutionSchema = new EntitySchema<WorkExecutionRow>({
  name: 'work_execution',
  tableName: 'work_executions',
  columns: {
    id: { type: 'uuid', primary: true },
    workflow_run_id: { type: 'uuid' },
    workflow_id: { type: 'uuid' },
    work_node_config_id: { type: 'uuid' },
    sequence: { type: 'int' },
    model: { type: 'varchar', length: 100 },
    task_executions: { type: 'jsonb', default: '[]' },
    current_task_index: { type: 'int', default: 0 },
    is_completed: { type: 'boolean', default: false },
    is_cancelled: { type: 'boolean', default: false },
    version: { type: 'int', default: 0 },
  },
});
