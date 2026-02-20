import { TaskExecutionId, ReportId } from '../value-objects/index.js';

export interface TaskExecutionProps {
  id: TaskExecutionId;
  order: number;
  query: string;
  reportId: ReportId | null;
  isCompleted: boolean;
  isFailed: boolean;
  isCancelled: boolean;
}

export interface CreateTaskExecutionProps {
  order: number;
  query: string;
  reportId?: ReportId | null;
}

export class TaskExecution {
  private readonly _id: TaskExecutionId;
  private readonly _order: number;
  private readonly _query: string;
  private readonly _reportId: ReportId | null;
  private _isCompleted: boolean;
  private _isFailed: boolean;
  private _isCancelled: boolean;

  private constructor(props: TaskExecutionProps) {
    this._id = props.id;
    this._order = props.order;
    this._query = props.query;
    this._reportId = props.reportId;
    this._isCompleted = props.isCompleted;
    this._isFailed = props.isFailed;
    this._isCancelled = props.isCancelled;
  }

  static create(props: CreateTaskExecutionProps): TaskExecution {
    const id = TaskExecutionId.generate();
    return new TaskExecution({
      id,
      order: props.order,
      query: props.query,
      reportId: props.reportId ?? null,
      isCompleted: false,
      isFailed: false,
      isCancelled: false,
    });
  }

  static fromProps(props: TaskExecutionProps): TaskExecution {
    return new TaskExecution(props);
  }

  get id(): TaskExecutionId { return this._id; }
  get order(): number { return this._order; }
  get query(): string { return this._query; }
  get reportId(): ReportId | null { return this._reportId; }
  get isCompleted(): boolean { return this._isCompleted; }
  get isFailed(): boolean { return this._isFailed; }
  get isCancelled(): boolean { return this._isCancelled; }

  markCompleted(): void { this._isCompleted = true; }
  markFailed(): void { this._isFailed = true; }
  cancel(): void { this._isCancelled = true; }
  reset(): void {
    this._isCompleted = false;
    this._isFailed = false;
    this._isCancelled = false;
  }

  requiresReport(): boolean { return this._reportId !== null; }

  get isTerminal(): boolean {
    return this._isCompleted || this._isFailed || this._isCancelled;
  }
}
