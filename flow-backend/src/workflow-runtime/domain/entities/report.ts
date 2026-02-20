import { AggregateRoot } from '@common/aggregate-root.js';
import { ReportId, TaskExecutionId, WorkExecutionId, WorkflowRunId, ReportStatus } from '../value-objects/index.js';
import { ReportOutline } from '@common/value-objects/index.js';
import { ReportCompleted, ReportFailed } from '@common/events/index.js';
import { RuntimeInvariantViolationError, RuntimeInvalidStateTransitionError } from '../errors/index.js';

export interface ReportProps {
  id: ReportId;
  taskExecutionId: TaskExecutionId;
  workExecutionId: WorkExecutionId;
  workflowRunId: WorkflowRunId;
  outline: ReportOutline;
  filePath: string | null;
  content: string | null;
  status: ReportStatus;
  errorMessage?: string;
  version?: number;
}

export interface CreateReportProps {
  taskExecutionId: TaskExecutionId;
  workExecutionId: WorkExecutionId;
  workflowRunId: WorkflowRunId;
  outline: ReportOutline;
}

export class Report extends AggregateRoot<ReportId> {
  private readonly _id: ReportId;
  private readonly _taskExecutionId: TaskExecutionId;
  private readonly _workExecutionId: WorkExecutionId;
  private readonly _workflowRunId: WorkflowRunId;
  private readonly _outline: ReportOutline;
  private _filePath: string | null;
  private _content: string | null;
  private _status: ReportStatus;
  private _errorMessage: string | null;

  private constructor(props: ReportProps) {
    super();
    this._id = props.id;
    this._taskExecutionId = props.taskExecutionId;
    this._workExecutionId = props.workExecutionId;
    this._workflowRunId = props.workflowRunId;
    this._outline = props.outline;
    this._filePath = props.filePath;
    this._content = props.content ?? null;
    this._status = props.status;
    this._errorMessage = props.errorMessage ?? null;
    if (props.version !== undefined) this.setVersion(props.version);
  }

  static create(props: CreateReportProps): Report {
    const id = ReportId.generate();
    return new Report({
      id,
      taskExecutionId: props.taskExecutionId,
      workExecutionId: props.workExecutionId,
      workflowRunId: props.workflowRunId,
      outline: props.outline,
      filePath: null,
      content: null,
      status: ReportStatus.PENDING,
    });
  }

  static createWithId(id: ReportId, props: CreateReportProps): Report {
    return new Report({
      id,
      taskExecutionId: props.taskExecutionId,
      workExecutionId: props.workExecutionId,
      workflowRunId: props.workflowRunId,
      outline: props.outline,
      filePath: null,
      content: null,
      status: ReportStatus.PENDING,
    });
  }

  static fromProps(props: ReportProps): Report {
    return new Report(props);
  }

  get id(): ReportId { return this._id; }
  get taskExecutionId(): TaskExecutionId { return this._taskExecutionId; }
  get workExecutionId(): WorkExecutionId { return this._workExecutionId; }
  get workflowRunId(): WorkflowRunId { return this._workflowRunId; }
  get outline(): ReportOutline { return this._outline; }
  get filePath(): string | null { return this._filePath; }
  get content(): string | null { return this._content; }
  get status(): ReportStatus { return this._status; }
  get errorMessage(): string | null { return this._errorMessage; }

  complete(filePath: string, content: string): void {
    if (this._status !== ReportStatus.PENDING) {
      throw new RuntimeInvalidStateTransitionError('Report', this._status, ReportStatus.COMPLETED);
    }
    if (!filePath || filePath.trim().length === 0) {
      throw new RuntimeInvariantViolationError('Report', 'File path cannot be empty');
    }
    this._status = ReportStatus.COMPLETED;
    this._filePath = filePath;
    this._content = content;
    this.incrementVersion();
    this.addDomainEvent(new ReportCompleted({
      reportId: this._id,
      taskExecutionId: this._taskExecutionId,
      workExecutionId: this._workExecutionId,
      workflowRunId: this._workflowRunId,
      filePath,
    }));
  }

  fail(errorMessage: string): void {
    if (this._status !== ReportStatus.PENDING) {
      throw new RuntimeInvalidStateTransitionError('Report', this._status, ReportStatus.FAILED);
    }
    this._status = ReportStatus.FAILED;
    this._errorMessage = errorMessage;
    this.incrementVersion();
    this.addDomainEvent(new ReportFailed({
      reportId: this._id,
      taskExecutionId: this._taskExecutionId,
      workExecutionId: this._workExecutionId,
      workflowRunId: this._workflowRunId,
      errorMessage,
    }));
  }

  isTerminal(): boolean {
    return this._status === ReportStatus.COMPLETED || this._status === ReportStatus.FAILED;
  }

  reset(): void {
    this._status = ReportStatus.PENDING;
    this._filePath = null;
    this._content = null;
    this._errorMessage = null;
    this.incrementVersion();
  }
}
