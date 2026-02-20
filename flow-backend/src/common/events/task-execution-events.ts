import { BaseDomainEvent } from './domain-event.js';

type WorkExecutionId = string;
type TaskExecutionId = string;
type WorkflowRunId = string;

interface QueryRespondedPayload {
  taskExecutionId: TaskExecutionId;
  workExecutionId: WorkExecutionId;
  workflowRunId: WorkflowRunId;
}

export class QueryResponded extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'task-execution.query-responded';
  readonly payload: Readonly<QueryRespondedPayload>;

  constructor(payload: QueryRespondedPayload, correlationId?: string) {
    super(QueryResponded.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}
