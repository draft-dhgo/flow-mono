import type { Repository } from 'typeorm';
import { WorkExecutionRepository } from '../../domain/ports/work-execution-repository.js';
import { WorkExecution } from '../../domain/entities/work-execution.js';
import { TaskExecution } from '../../domain/entities/task-execution.js';
import type { WorkExecutionRow } from './work-execution.schema.js';
import { WorkExecutionId, WorkflowRunId, WorkNodeConfigId, TaskExecutionId, ReportId } from '../../domain/value-objects/index.js';
import { WorkflowId } from '@common/ids/index.js';

interface TaskExecutionJson {
  id: string;
  order: number;
  query: string;
  reportId: string | null;
  isCompleted: boolean;
  isFailed: boolean;
  isCancelled: boolean;
}

export class WorkExecutionTypeormRepository extends WorkExecutionRepository {
  constructor(private readonly repo: Repository<WorkExecutionRow>) {
    super();
  }

  private toDomain(row: WorkExecutionRow): WorkExecution {
    const taskData = row.task_executions as TaskExecutionJson[];
    return WorkExecution.fromProps({
      id: WorkExecutionId.create(row.id),
      workflowRunId: WorkflowRunId.create(row.workflow_run_id),
      workflowId: WorkflowId.create(row.workflow_id),
      workNodeConfigId: WorkNodeConfigId.create(row.work_node_config_id),
      sequence: row.sequence,
      model: row.model,
      taskExecutions: taskData.map((t) =>
        TaskExecution.fromProps({
          id: TaskExecutionId.create(t.id),
          order: t.order,
          query: t.query,
          reportId: t.reportId ? ReportId.create(t.reportId) : null,
          isCompleted: t.isCompleted,
          isFailed: t.isFailed,
          isCancelled: t.isCancelled,
        }),
      ),
      currentTaskIndex: row.current_task_index,
      isCompleted: row.is_completed,
      isCancelled: row.is_cancelled,
      version: row.version,
    });
  }

  private toRow(entity: WorkExecution): WorkExecutionRow {
    return {
      id: entity.id as string,
      workflow_run_id: entity.workflowRunId as string,
      workflow_id: entity.workflowId as string,
      work_node_config_id: entity.workNodeConfigId as string,
      sequence: entity.sequence,
      model: entity.model,
      task_executions: entity.taskExecutions.map((t) => ({
        id: t.id as string,
        order: t.order,
        query: t.query,
        reportId: t.reportId ? (t.reportId as string) : null,
        isCompleted: t.isCompleted,
        isFailed: t.isFailed,
        isCancelled: t.isCancelled,
      })),
      current_task_index: entity.currentTaskIndex,
      is_completed: entity.isCompleted,
      is_cancelled: entity.isCancelled,
      version: entity.version,
    };
  }

  async findById(id: WorkExecutionId): Promise<WorkExecution | null> {
    const row = await this.repo.findOneBy({ id: id as string });
    return row ? this.toDomain(row) : null;
  }

  async findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<WorkExecution[]> {
    const rows = await this.repo.findBy({
      workflow_run_id: workflowRunId as string,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByWorkflowRunIdOrderedBySequence(workflowRunId: WorkflowRunId): Promise<WorkExecution[]> {
    const rows = await this.repo.find({
      where: { workflow_run_id: workflowRunId as string },
      order: { sequence: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(workExecution: WorkExecution): Promise<void> {
    const row = this.toRow(workExecution);
    await this.repo.save(row);
  }

  async saveAll(workExecutions: WorkExecution[]): Promise<void> {
    const rows = workExecutions.map((we) => this.toRow(we));
    await this.repo.save(rows);
  }

  async delete(id: WorkExecutionId): Promise<void> {
    await this.repo.delete({ id: id as string });
  }

  async deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void> {
    await this.repo.delete({ workflow_run_id: workflowRunId as string });
  }

  async exists(id: WorkExecutionId): Promise<boolean> {
    const count = await this.repo.countBy({ id: id as string });
    return count > 0;
  }
}
