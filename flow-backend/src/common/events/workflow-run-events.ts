import { BaseDomainEvent } from './domain-event.js';
import type { WorkflowId } from '../ids/index.js';

type WorkflowRunId = string;

interface WorkflowRunCreatedPayload {
  workflowRunId: WorkflowRunId;
  workflowId: WorkflowId;
}

export class WorkflowRunCreated extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow-run.created';
  readonly payload: Readonly<WorkflowRunCreatedPayload>;

  constructor(payload: WorkflowRunCreatedPayload, correlationId?: string) {
    super(WorkflowRunCreated.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkflowRunStartedPayload {
  workflowRunId: WorkflowRunId;
}

export class WorkflowRunStarted extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow-run.started';
  readonly payload: Readonly<WorkflowRunStartedPayload>;

  constructor(payload: WorkflowRunStartedPayload, correlationId?: string) {
    super(WorkflowRunStarted.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkflowRunPausedPayload {
  workflowRunId: WorkflowRunId;
}

export class WorkflowRunPaused extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow-run.paused';
  readonly payload: Readonly<WorkflowRunPausedPayload>;

  constructor(payload: WorkflowRunPausedPayload, correlationId?: string) {
    super(WorkflowRunPaused.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkflowRunResumedPayload {
  workflowRunId: WorkflowRunId;
}

export class WorkflowRunResumed extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow-run.resumed';
  readonly payload: Readonly<WorkflowRunResumedPayload>;

  constructor(payload: WorkflowRunResumedPayload, correlationId?: string) {
    super(WorkflowRunResumed.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkflowRunCompletedPayload {
  workflowRunId: WorkflowRunId;
}

export class WorkflowRunCompleted extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow-run.completed';
  readonly payload: Readonly<WorkflowRunCompletedPayload>;

  constructor(payload: WorkflowRunCompletedPayload, correlationId?: string) {
    super(WorkflowRunCompleted.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkflowRunAwaitingPayload {
  workflowRunId: WorkflowRunId;
}

export class WorkflowRunAwaiting extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow-run.awaiting';
  readonly payload: Readonly<WorkflowRunAwaitingPayload>;

  constructor(payload: WorkflowRunAwaitingPayload, correlationId?: string) {
    super(WorkflowRunAwaiting.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkflowRunCancelledPayload {
  workflowRunId: WorkflowRunId;
  reason?: string;
}

export class WorkflowRunCancelled extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow-run.cancelled';
  readonly payload: Readonly<WorkflowRunCancelledPayload>;

  constructor(payload: WorkflowRunCancelledPayload, correlationId?: string) {
    super(WorkflowRunCancelled.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkNodeConfigUpdatedPayload {
  workflowRunId: WorkflowRunId;
  sequence: number;
}

export class WorkNodeConfigUpdated extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow-run.work_node_config_updated';
  readonly payload: Readonly<WorkNodeConfigUpdatedPayload>;

  constructor(payload: WorkNodeConfigUpdatedPayload, correlationId?: string) {
    super(WorkNodeConfigUpdated.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkNodeAddedPayload {
  workflowRunId: WorkflowRunId;
  sequence: number;
}

export class WorkNodeAdded extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow-run.work_node_added';
  readonly payload: Readonly<WorkNodeAddedPayload>;

  constructor(payload: WorkNodeAddedPayload, correlationId?: string) {
    super(WorkNodeAdded.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkNodeRemovedPayload {
  workflowRunId: WorkflowRunId;
  sequence: number;
}

export class WorkNodeRemoved extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow-run.work_node_removed';
  readonly payload: Readonly<WorkNodeRemovedPayload>;

  constructor(payload: WorkNodeRemovedPayload, correlationId?: string) {
    super(WorkNodeRemoved.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}
