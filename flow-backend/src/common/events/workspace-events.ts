import { BaseDomainEvent } from './domain-event.js';

type WorkspaceId = string;

interface WorkspaceCreatedPayload {
  workspaceId: WorkspaceId;
}

export class WorkspaceCreated extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workspace.created';
  readonly payload: Readonly<WorkspaceCreatedPayload>;

  constructor(payload: WorkspaceCreatedPayload, correlationId?: string) {
    super(WorkspaceCreated.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkspaceCompletedPayload {
  workspaceId: WorkspaceId;
}

export class WorkspaceCompleted extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workspace.completed';
  readonly payload: Readonly<WorkspaceCompletedPayload>;

  constructor(payload: WorkspaceCompletedPayload, correlationId?: string) {
    super(WorkspaceCompleted.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}
