import type { Report } from '../entities/report.js';
import type { ReportId, WorkExecutionId, WorkflowRunId } from '../value-objects/index.js';

export abstract class ReportRepository {
  abstract findById(id: ReportId): Promise<Report | null>;
  abstract findByWorkExecutionId(workExecutionId: WorkExecutionId): Promise<Report[]>;
  abstract findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<Report[]>;
  abstract save(report: Report): Promise<void>;
  abstract delete(id: ReportId): Promise<void>;
  abstract deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void>;
  abstract exists(id: ReportId): Promise<boolean>;
}
