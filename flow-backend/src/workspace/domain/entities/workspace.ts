import { AggregateRoot } from '@common/aggregate-root.js';
import type { WorkspaceId } from '@common/ids/index.js';
import { WorkspaceStatus } from '../value-objects/workspace-status.js';
import { WorkspacePurpose } from '../value-objects/workspace-purpose.js';
import type { WorkspaceGitRef } from '../value-objects/workspace-git-ref.js';
import { WorkspaceCreated, WorkspaceCompleted } from '@common/events/workspace-events.js';
import { WorkspaceInvariantViolationError, WorkspaceInvalidStateTransitionError } from '../errors/index.js';

export interface McpServerRefConfig {
  readonly mcpServerId: string;
  readonly envOverrides: Record<string, string>;
}

export interface WorkspaceCreateProps {
  readonly name: string;
  readonly model: string;
  readonly gitRefs: WorkspaceGitRef[];
  readonly mcpServerRefs: McpServerRefConfig[];
  readonly path: string;
  readonly purpose?: WorkspacePurpose;
}

export interface WorkspaceFromProps {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly status: WorkspaceStatus;
  readonly model: string;
  readonly gitRefs: WorkspaceGitRef[];
  readonly mcpServerRefs: McpServerRefConfig[];
  readonly path: string;
  readonly agentSessionId: string | null;
  readonly createdAt: Date;
  readonly purpose?: WorkspacePurpose;
  readonly version?: number;
}

export class Workspace extends AggregateRoot<WorkspaceId> {
  private readonly _id: WorkspaceId;
  private readonly _name: string;
  private _status: WorkspaceStatus;
  private readonly _model: string;
  private readonly _gitRefs: readonly WorkspaceGitRef[];
  private readonly _mcpServerRefs: readonly McpServerRefConfig[];
  private readonly _path: string;
  private _agentSessionId: string | null;
  private readonly _createdAt: Date;
  private readonly _purpose: WorkspacePurpose;

  private constructor(props: WorkspaceFromProps) {
    super();
    this._id = props.id;
    this._name = props.name;
    this._status = props.status;
    this._model = props.model;
    this._gitRefs = Object.freeze([...props.gitRefs]);
    this._mcpServerRefs = Object.freeze([...props.mcpServerRefs]);
    this._path = props.path;
    this._agentSessionId = props.agentSessionId;
    this._createdAt = props.createdAt;
    this._purpose = props.purpose ?? WorkspacePurpose.GENERAL;
    if (props.version !== undefined) {
      this.setVersion(props.version);
    }
  }

  static create(props: WorkspaceCreateProps & { id: WorkspaceId }): Workspace {
    if (!props.name.trim()) {
      throw new WorkspaceInvariantViolationError('Workspace', 'Name cannot be empty');
    }
    if (!props.model.trim()) {
      throw new WorkspaceInvariantViolationError('Workspace', 'Model cannot be empty');
    }

    const workspace = new Workspace({
      id: props.id,
      name: props.name,
      status: WorkspaceStatus.ACTIVE,
      model: props.model,
      gitRefs: props.gitRefs,
      mcpServerRefs: props.mcpServerRefs,
      path: props.path,
      agentSessionId: null,
      createdAt: new Date(),
      purpose: props.purpose ?? WorkspacePurpose.GENERAL,
    });

    workspace.addDomainEvent(new WorkspaceCreated({ workspaceId: props.id }));
    return workspace;
  }

  static fromProps(props: WorkspaceFromProps): Workspace {
    return new Workspace(props);
  }

  get id(): WorkspaceId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get status(): WorkspaceStatus {
    return this._status;
  }

  get model(): string {
    return this._model;
  }

  get gitRefs(): readonly WorkspaceGitRef[] {
    return this._gitRefs;
  }

  get mcpServerRefs(): readonly McpServerRefConfig[] {
    return this._mcpServerRefs;
  }

  get path(): string {
    return this._path;
  }

  get agentSessionId(): string | null {
    return this._agentSessionId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get purpose(): WorkspacePurpose {
    return this._purpose;
  }

  assignAgentSession(sessionId: string): void {
    this._agentSessionId = sessionId;
    this.incrementVersion();
  }

  complete(): void {
    if (this._status !== WorkspaceStatus.ACTIVE) {
      throw new WorkspaceInvalidStateTransitionError(
        'Workspace',
        this._status,
        WorkspaceStatus.COMPLETED,
      );
    }
    this._status = WorkspaceStatus.COMPLETED;
    this.incrementVersion();
    this.addDomainEvent(new WorkspaceCompleted({ workspaceId: this._id }));
  }

  isActive(): boolean {
    return this._status === WorkspaceStatus.ACTIVE;
  }
}
