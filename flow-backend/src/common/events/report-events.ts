import { BaseDomainEvent } from './domain-event.js';

type ReportId = string;
type TaskExecutionId = string;
type WorkExecutionId = string;
type WorkflowRunId = string;

interface ReportCompletedPayload {
  reportId: ReportId;
  taskExecutionId: TaskExecutionId;
  workExecutionId: WorkExecutionId;
  workflowRunId: WorkflowRunId;
  filePath: string;
}

export class ReportCompleted extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'report.completed';
  readonly payload: Readonly<ReportCompletedPayload>;

  constructor(payload: ReportCompletedPayload, correlationId?: string) {
    super(ReportCompleted.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface ReportFailedPayload {
  reportId: ReportId;
  taskExecutionId: TaskExecutionId;
  workExecutionId: WorkExecutionId;
  workflowRunId: WorkflowRunId;
  errorMessage: string;
}

export class ReportFailed extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'report.failed';
  readonly payload: Readonly<ReportFailedPayload>;

  constructor(payload: ReportFailedPayload, correlationId?: string) {
    super(ReportFailed.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}
