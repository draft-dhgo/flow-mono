import { AggregateRoot } from '@common/aggregate-root.js';
import { WorkflowId, WorkflowStatus, GitRef, McpServerRef } from '../value-objects/index.js';
import type { BranchStrategy } from '../value-objects/index.js';
import type { WorkDefinition } from '../value-objects/index.js';
import type { GitId, McpServerId } from '@common/ids/index.js';
import {
  WorkflowCreated,
  WorkflowUpdated,
  WorkflowDeleted,
  WorkflowGitRefsUpdated,
  WorkflowMcpServerRefsUpdated,
  WorkflowActivated,
  WorkflowDeactivated,
} from '@common/events/index.js';
import { WorkflowInvariantViolationError } from '../errors/index.js';

export interface WorkflowCreateProps {
  readonly name: string;
  readonly description?: string;
  readonly branchStrategy: BranchStrategy;
  readonly gitRefs?: GitRef[];
  readonly mcpServerRefs?: McpServerRef[];
  readonly seedKeys?: string[];
  readonly workDefinitions: WorkDefinition[];
}

export interface WorkflowFromProps {
  readonly id: WorkflowId;
  readonly name: string;
  readonly description: string;
  readonly branchStrategy: BranchStrategy;
  readonly gitRefs: GitRef[];
  readonly mcpServerRefs: McpServerRef[];
  readonly seedKeys: string[];
  readonly workDefinitions: WorkDefinition[];
  readonly status: WorkflowStatus;
  readonly version?: number;
}

export class Workflow extends AggregateRoot<WorkflowId> {
  private readonly _id: WorkflowId;
  private _name: string;
  private _description: string;
  private readonly _branchStrategy: BranchStrategy;
  private _gitRefs: GitRef[];
  private _mcpServerRefs: McpServerRef[];
  private _seedKeys: string[];
  private _workDefinitions: WorkDefinition[];
  private _status: WorkflowStatus;

  private constructor(props: {
    id: WorkflowId;
    name: string;
    description: string;
    branchStrategy: BranchStrategy;
    gitRefs: GitRef[];
    mcpServerRefs: McpServerRef[];
    seedKeys: string[];
    workDefinitions: WorkDefinition[];
    status: WorkflowStatus;
    version?: number;
  }) {
    super();
    this._id = props.id;
    this._name = props.name;
    this._description = props.description;
    this._branchStrategy = props.branchStrategy;
    this._gitRefs = [...props.gitRefs];
    this._mcpServerRefs = [...props.mcpServerRefs];
    this._seedKeys = [...props.seedKeys];
    this._workDefinitions = [...props.workDefinitions];
    this._status = props.status;
    if (props.version !== undefined) {
      this.setVersion(props.version);
    }
  }

  static create(props: WorkflowCreateProps): Workflow {
    const workflow = new Workflow({
      id: WorkflowId.generate(),
      name: props.name,
      description: props.description ?? '',
      branchStrategy: props.branchStrategy,
      gitRefs: props.gitRefs ?? [],
      mcpServerRefs: props.mcpServerRefs ?? [],
      seedKeys: props.seedKeys ?? [],
      workDefinitions: props.workDefinitions,
      status: WorkflowStatus.DRAFT,
    });

    workflow.validateInvariants();

    workflow.addDomainEvent(
      new WorkflowCreated({
        workflowId: workflow._id,
        name: workflow._name,
      })
    );

    if (workflow._gitRefs.length > 0) {
      workflow.addDomainEvent(
        new WorkflowGitRefsUpdated({
          workflowId: workflow._id,
          addedGitIds: workflow._gitRefs.map((ref) => ref.gitId),
          removedGitIds: [],
        })
      );
    }

    if (workflow._mcpServerRefs.length > 0) {
      workflow.addDomainEvent(
        new WorkflowMcpServerRefsUpdated({
          workflowId: workflow._id,
          addedMcpServerIds: workflow._mcpServerRefs.map((ref) => ref.mcpServerId),
          removedMcpServerIds: [],
        })
      );
    }

    return workflow;
  }

  static fromProps(props: WorkflowFromProps): Workflow {
    const workflow = new Workflow({
      id: props.id,
      name: props.name,
      description: props.description,
      branchStrategy: props.branchStrategy,
      gitRefs: props.gitRefs,
      mcpServerRefs: props.mcpServerRefs,
      seedKeys: props.seedKeys,
      workDefinitions: props.workDefinitions,
      status: props.status,
      version: props.version,
    });

    workflow.validateInvariants();

    return workflow;
  }

  private validateInvariants(): void {
    if (!this._name.trim()) {
      throw new WorkflowInvariantViolationError('Workflow name cannot be empty');
    }
    if (this._workDefinitions.length === 0) {
      throw new WorkflowInvariantViolationError('Workflow must have at least one WorkDefinition');
    }
    if (new Set(this._seedKeys).size !== this._seedKeys.length) {
      throw new WorkflowInvariantViolationError('Seed keys must be unique');
    }
  }

  private guardDraftStatus(): void {
    if (this._status !== WorkflowStatus.DRAFT) {
      throw new WorkflowInvariantViolationError(
        'Workflow can only be modified in DRAFT status'
      );
    }
  }

  // ==================== Getters ====================

  get id(): WorkflowId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get branchStrategy(): BranchStrategy {
    return this._branchStrategy;
  }

  get gitRefs(): ReadonlyArray<GitRef> {
    return [...this._gitRefs];
  }

  get mcpServerRefs(): ReadonlyArray<McpServerRef> {
    return [...this._mcpServerRefs];
  }

  get seedKeys(): ReadonlyArray<string> {
    return [...this._seedKeys];
  }

  get workDefinitions(): ReadonlyArray<WorkDefinition> {
    return [...this._workDefinitions];
  }

  get status(): WorkflowStatus {
    return this._status;
  }

  // ==================== Status Transitions ====================

  activate(): void {
    if (this._status !== WorkflowStatus.DRAFT) {
      throw new WorkflowInvariantViolationError(
        'Workflow can only be activated from DRAFT status'
      );
    }

    const hasInvalidGitRef = this._gitRefs.some((ref) => !ref.valid);
    if (hasInvalidGitRef) {
      throw new WorkflowInvariantViolationError(
        'Cannot activate workflow with invalid git references'
      );
    }

    const hasInvalidMcpServerRef = this._mcpServerRefs.some((ref) => !ref.valid);
    if (hasInvalidMcpServerRef) {
      throw new WorkflowInvariantViolationError(
        'Cannot activate workflow with invalid MCP server references'
      );
    }

    this._status = WorkflowStatus.ACTIVE;
    this.incrementVersion();
    this.addDomainEvent(new WorkflowActivated({ workflowId: this._id }));
  }

  deactivate(): void {
    if (this._status !== WorkflowStatus.ACTIVE) {
      throw new WorkflowInvariantViolationError(
        'Workflow can only be deactivated from ACTIVE status'
      );
    }

    this._status = WorkflowStatus.DRAFT;
    this.incrementVersion();
    this.addDomainEvent(new WorkflowDeactivated({ workflowId: this._id }));
  }

  // ==================== Modification ====================

  updateName(name: string): void {
    this.guardDraftStatus();
    if (!name.trim()) {
      throw new WorkflowInvariantViolationError('Workflow name cannot be empty');
    }
    this._name = name;
    this.incrementVersion();
    this.addDomainEvent(new WorkflowUpdated({ workflowId: this._id }));
  }

  updateDescription(description: string): void {
    this.guardDraftStatus();
    this._description = description;
    this.incrementVersion();
    this.addDomainEvent(new WorkflowUpdated({ workflowId: this._id }));
  }

  updateGitRefs(gitRefs: GitRef[]): void {
    this.guardDraftStatus();
    const addedGitIds: GitId[] = [];
    const removedGitIds: GitId[] = [];

    for (const oldRef of this._gitRefs) {
      if (!gitRefs.some((r) => r.gitId === oldRef.gitId)) {
        removedGitIds.push(oldRef.gitId);
      }
    }

    for (const newRef of gitRefs) {
      if (!this._gitRefs.some((r) => r.gitId === newRef.gitId)) {
        addedGitIds.push(newRef.gitId);
      }
    }

    this._gitRefs = [...gitRefs];
    this.incrementVersion();

    if (addedGitIds.length > 0 || removedGitIds.length > 0) {
      this.addDomainEvent(
        new WorkflowGitRefsUpdated({
          workflowId: this._id,
          addedGitIds,
          removedGitIds,
        })
      );
    }
  }

  updateMcpServerRefs(mcpServerRefs: McpServerRef[]): void {
    this.guardDraftStatus();
    const addedMcpServerIds: McpServerId[] = [];
    const removedMcpServerIds: McpServerId[] = [];

    for (const oldRef of this._mcpServerRefs) {
      if (!mcpServerRefs.some((r) => r.mcpServerId === oldRef.mcpServerId)) {
        removedMcpServerIds.push(oldRef.mcpServerId);
      }
    }

    for (const newRef of mcpServerRefs) {
      if (!this._mcpServerRefs.some((r) => r.mcpServerId === newRef.mcpServerId)) {
        addedMcpServerIds.push(newRef.mcpServerId);
      }
    }

    this._mcpServerRefs = [...mcpServerRefs];
    this.incrementVersion();

    if (addedMcpServerIds.length > 0 || removedMcpServerIds.length > 0) {
      this.addDomainEvent(
        new WorkflowMcpServerRefsUpdated({
          workflowId: this._id,
          addedMcpServerIds,
          removedMcpServerIds,
        })
      );
    }
  }

  updateWorkDefinitions(workDefinitions: WorkDefinition[]): void {
    this.guardDraftStatus();
    if (workDefinitions.length === 0) {
      throw new WorkflowInvariantViolationError('Workflow must have at least one WorkDefinition');
    }
    this._workDefinitions = [...workDefinitions];
    this.incrementVersion();
    this.addDomainEvent(new WorkflowUpdated({ workflowId: this._id }));
  }

  updateSeedKeys(seedKeys: string[]): void {
    this.guardDraftStatus();
    this._seedKeys = [...seedKeys];
    this.incrementVersion();
    this.addDomainEvent(new WorkflowUpdated({ workflowId: this._id }));
  }

  // ==================== Cascading Reference Removal ====================

  removeGitRef(gitId: GitId): void {
    this._gitRefs = this._gitRefs.filter((ref) => ref.gitId !== gitId);
    this._workDefinitions = this._workDefinitions.map((wd) => wd.removeGitRef(gitId));
    this.incrementVersion();
    this.addDomainEvent(
      new WorkflowGitRefsUpdated({
        workflowId: this._id,
        addedGitIds: [],
        removedGitIds: [gitId],
      })
    );
  }

  removeMcpServerRef(mcpServerId: McpServerId): void {
    this._mcpServerRefs = this._mcpServerRefs.filter(
      (ref) => ref.mcpServerId !== mcpServerId
    );
    this._workDefinitions = this._workDefinitions.map((wd) =>
      wd.removeMcpServerRef(mcpServerId)
    );
    this.incrementVersion();
    this.addDomainEvent(
      new WorkflowMcpServerRefsUpdated({
        workflowId: this._id,
        addedMcpServerIds: [],
        removedMcpServerIds: [mcpServerId],
      })
    );
  }

  // ==================== Cascading Reference Invalidation ====================

  markGitRefInvalid(gitId: GitId): void {
    this._gitRefs = this._gitRefs.map((ref) =>
      ref.gitId === gitId ? GitRef.invalidate(ref) : ref
    );
    this._workDefinitions = this._workDefinitions.map((wd) =>
      wd.markGitRefInvalid(gitId)
    );
    this.incrementVersion();
    this.addDomainEvent(new WorkflowUpdated({ workflowId: this._id }));
  }

  markMcpServerRefInvalid(mcpServerId: McpServerId): void {
    this._mcpServerRefs = this._mcpServerRefs.map((ref) =>
      ref.mcpServerId === mcpServerId ? McpServerRef.invalidate(ref) : ref
    );
    this._workDefinitions = this._workDefinitions.map((wd) =>
      wd.markMcpServerRefInvalid(mcpServerId)
    );
    this.incrementVersion();
    this.addDomainEvent(new WorkflowUpdated({ workflowId: this._id }));
  }

  // ==================== Deletion ====================

  delete(): void {
    this.guardDraftStatus();

    const currentGitIds = this._gitRefs.map((ref) => ref.gitId);
    if (currentGitIds.length > 0) {
      this.addDomainEvent(
        new WorkflowGitRefsUpdated({
          workflowId: this._id,
          addedGitIds: [],
          removedGitIds: currentGitIds,
        })
      );
    }

    const currentMcpServerIds = this._mcpServerRefs.map((ref) => ref.mcpServerId);
    if (currentMcpServerIds.length > 0) {
      this.addDomainEvent(
        new WorkflowMcpServerRefsUpdated({
          workflowId: this._id,
          addedMcpServerIds: [],
          removedMcpServerIds: currentMcpServerIds,
        })
      );
    }

    this.addDomainEvent(
      new WorkflowDeleted({
        workflowId: this._id,
      })
    );
  }

}
