import { BaseDomainEvent } from './domain-event.js';
import type { WorkflowId } from '../ids/index.js';

type WorkflowRunId = string;
type WorkExecutionId = string;

interface WorkExecutionStartedPayload {
  workExecutionId: WorkExecutionId;
  workflowRunId: WorkflowRunId;
  workflowId: WorkflowId;
  sequence: number;
}

export class WorkExecutionStarted extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'work-execution.started';
  readonly payload: Readonly<WorkExecutionStartedPayload>;

  constructor(payload: WorkExecutionStartedPayload, correlationId?: string) {
    super(WorkExecutionStarted.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkExecutionCompletedPayload {
  workExecutionId: WorkExecutionId;
  workflowRunId: WorkflowRunId;
  sequence: number;
}

export class WorkExecutionCompleted extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'work-execution.completed';
  readonly payload: Readonly<WorkExecutionCompletedPayload>;

  constructor(payload: WorkExecutionCompletedPayload, correlationId?: string) {
    super(WorkExecutionCompleted.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}
