import { BaseDomainEvent } from './domain-event.js';
import type { WorkflowId } from '../ids/index.js';

type CheckpointId = string;
type WorkflowRunId = string;
type WorkExecutionId = string;

interface CheckpointCreatedPayload {
  checkpointId: CheckpointId;
  workflowRunId: WorkflowRunId;
  workflowId: WorkflowId;
  workExecutionId: WorkExecutionId;
  workSequence: number;
}

export class CheckpointCreated extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'checkpoint.created';
  readonly payload: Readonly<CheckpointCreatedPayload>;

  constructor(payload: CheckpointCreatedPayload, correlationId?: string) {
    super(CheckpointCreated.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}
