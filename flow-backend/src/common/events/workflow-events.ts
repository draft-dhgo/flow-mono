import { BaseDomainEvent } from './domain-event.js';
import type { WorkflowId, GitId, McpServerId } from '../ids/index.js';

interface WorkflowCreatedPayload {
  workflowId: WorkflowId;
  name: string;
}

export class WorkflowCreated extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow.created';
  readonly payload: Readonly<WorkflowCreatedPayload>;

  constructor(payload: WorkflowCreatedPayload, correlationId?: string) {
    super(WorkflowCreated.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkflowUpdatedPayload {
  workflowId: WorkflowId;
}

export class WorkflowUpdated extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow.updated';
  readonly payload: Readonly<WorkflowUpdatedPayload>;

  constructor(payload: WorkflowUpdatedPayload, correlationId?: string) {
    super(WorkflowUpdated.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkflowDeletedPayload {
  workflowId: WorkflowId;
}

export class WorkflowDeleted extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow.deleted';
  readonly payload: Readonly<WorkflowDeletedPayload>;

  constructor(payload: WorkflowDeletedPayload, correlationId?: string) {
    super(WorkflowDeleted.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkflowGitRefsUpdatedPayload {
  workflowId: WorkflowId;
  addedGitIds: GitId[];
  removedGitIds: GitId[];
}

export class WorkflowGitRefsUpdated extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow.git-refs-updated';
  readonly payload: Readonly<WorkflowGitRefsUpdatedPayload>;

  constructor(payload: WorkflowGitRefsUpdatedPayload, correlationId?: string) {
    super(WorkflowGitRefsUpdated.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkflowMcpServerRefsUpdatedPayload {
  workflowId: WorkflowId;
  addedMcpServerIds: McpServerId[];
  removedMcpServerIds: McpServerId[];
}

export class WorkflowMcpServerRefsUpdated extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow.mcp-server-refs-updated';
  readonly payload: Readonly<WorkflowMcpServerRefsUpdatedPayload>;

  constructor(payload: WorkflowMcpServerRefsUpdatedPayload, correlationId?: string) {
    super(WorkflowMcpServerRefsUpdated.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkflowActivatedPayload {
  workflowId: WorkflowId;
}

export class WorkflowActivated extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow.activated';
  readonly payload: Readonly<WorkflowActivatedPayload>;

  constructor(payload: WorkflowActivatedPayload, correlationId?: string) {
    super(WorkflowActivated.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface WorkflowDeactivatedPayload {
  workflowId: WorkflowId;
}

export class WorkflowDeactivated extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'workflow.deactivated';
  readonly payload: Readonly<WorkflowDeactivatedPayload>;

  constructor(payload: WorkflowDeactivatedPayload, correlationId?: string) {
    super(WorkflowDeactivated.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}
