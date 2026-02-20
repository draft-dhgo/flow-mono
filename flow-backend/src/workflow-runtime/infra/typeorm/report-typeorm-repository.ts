import type { Repository } from 'typeorm';
import { ReportRepository } from '../../domain/ports/report-repository.js';
import { Report } from '../../domain/entities/report.js';
import type { ReportRow } from './report.schema.js';
import { ReportId, TaskExecutionId, WorkExecutionId, WorkflowRunId, ReportStatus } from '../../domain/value-objects/index.js';
import { ReportOutline } from '@common/value-objects/index.js';
import { Section } from '@common/value-objects/index.js';

interface SectionJson {
  title: string;
  description: string;
}

export class ReportTypeormRepository extends ReportRepository {
  constructor(private readonly repo: Repository<ReportRow>) {
    super();
  }

  private toDomain(row: ReportRow): Report {
    const outlineData = row.outline as SectionJson[];
    return Report.fromProps({
      id: ReportId.create(row.id),
      taskExecutionId: TaskExecutionId.create(row.task_execution_id),
      workExecutionId: WorkExecutionId.create(row.work_execution_id),
      workflowRunId: WorkflowRunId.create(row.workflow_run_id),
      outline: ReportOutline.fromProps(
        outlineData.map((s) => Section.fromProps(s.title, s.description)),
      ),
      filePath: row.file_path,
      content: row.content,
      status: row.status as ReportStatus,
      errorMessage: row.error_message ?? undefined,
      version: row.version,
    });
  }

  private toRow(entity: Report): ReportRow {
    return {
      id: entity.id as string,
      task_execution_id: entity.taskExecutionId as string,
      work_execution_id: entity.workExecutionId as string,
      workflow_run_id: entity.workflowRunId as string,
      outline: entity.outline.sections.map((s) => ({
        title: s.title,
        description: s.description,
      })),
      file_path: entity.filePath,
      content: entity.content,
      status: entity.status as string,
      error_message: entity.errorMessage,
      version: entity.version,
    };
  }

  async findById(id: ReportId): Promise<Report | null> {
    const row = await this.repo.findOneBy({ id: id as string });
    return row ? this.toDomain(row) : null;
  }

  async findByWorkExecutionId(workExecutionId: WorkExecutionId): Promise<Report[]> {
    const rows = await this.repo.findBy({
      work_execution_id: workExecutionId as string,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<Report[]> {
    const rows = await this.repo.findBy({
      workflow_run_id: workflowRunId as string,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(report: Report): Promise<void> {
    const row = this.toRow(report);
    await this.repo.save(row);
  }

  async delete(id: ReportId): Promise<void> {
    await this.repo.delete({ id: id as string });
  }

  async deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void> {
    await this.repo.delete({ workflow_run_id: workflowRunId as string });
  }

  async exists(id: ReportId): Promise<boolean> {
    const count = await this.repo.countBy({ id: id as string });
    return count > 0;
  }
}
