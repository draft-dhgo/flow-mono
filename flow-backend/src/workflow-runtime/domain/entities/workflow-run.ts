import { AggregateRoot } from '@common/aggregate-root.js';
import {
  WorkflowRunId, WorkExecutionId, WorkflowRunStatus,
  WorkNodeConfig, GitRefNodeConfig, McpServerRefNodeConfig,
} from '../value-objects/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import {
  WorkflowRunCreated, WorkflowRunStarted, WorkflowRunPaused,
  WorkflowRunAwaiting, WorkflowRunResumed, WorkflowRunCompleted,
  WorkflowRunCancelled, WorkNodeConfigUpdated, WorkNodeAdded, WorkNodeRemoved,
} from '@common/events/index.js';
import { RuntimeInvariantViolationError, RuntimeInvalidStateTransitionError } from '../errors/index.js';

export interface WorkflowRunCreateProps {
  workflowId: WorkflowId;
  issueKey: string;
  seedValues?: Readonly<Record<string, string>>;
  gitRefPool: GitRefNodeConfig[];
  mcpServerRefPool: McpServerRefNodeConfig[];
  workNodeConfigs: WorkNodeConfig[];
}

export interface WorkflowRunFromProps {
  id: WorkflowRunId;
  workflowId: WorkflowId;
  issueKey: string;
  seedValues: Readonly<Record<string, string>>;
  status: WorkflowRunStatus;
  currentWorkIndex: number;
  cancelledAtWorkIndex: number | null;
  cancellationReason: string | null;
  workExecutionIds: WorkExecutionId[];
  gitRefPool: GitRefNodeConfig[];
  mcpServerRefPool: McpServerRefNodeConfig[];
  workNodeConfigs: WorkNodeConfig[];
  restoredToCheckpoint: boolean;
  version?: number;
}

export class WorkflowRun extends AggregateRoot<WorkflowRunId> {
  private readonly _id: WorkflowRunId;
  private readonly _workflowId: WorkflowId;
  private readonly _issueKey: string;
  private _status: WorkflowRunStatus;
  private _currentWorkIndex: number;
  private _cancelledAtWorkIndex: number | null;
  private _cancellationReason: string | null;
  private _workExecutionIds: WorkExecutionId[];
  private readonly _gitRefPool: readonly GitRefNodeConfig[];
  private readonly _mcpServerRefPool: readonly McpServerRefNodeConfig[];
  private _workNodeConfigs: WorkNodeConfig[];
  private readonly _seedValues: Readonly<Record<string, string>>;
  private _restoredToCheckpoint: boolean;

  private constructor(props: WorkflowRunFromProps) {
    super();
    this._id = props.id;
    this._workflowId = props.workflowId;
    this._issueKey = props.issueKey;
    this._status = props.status;
    this._currentWorkIndex = props.currentWorkIndex;
    this._cancelledAtWorkIndex = props.cancelledAtWorkIndex;
    this._cancellationReason = props.cancellationReason;
    this._workExecutionIds = [...props.workExecutionIds];
    this._gitRefPool = Object.freeze([...props.gitRefPool]);
    this._mcpServerRefPool = Object.freeze([...props.mcpServerRefPool]);
    this._workNodeConfigs = [...props.workNodeConfigs];
    this._seedValues = Object.freeze({ ...props.seedValues });
    this._restoredToCheckpoint = props.restoredToCheckpoint;
    if (props.version !== undefined) this.setVersion(props.version);
  }

  static create(props: WorkflowRunCreateProps): WorkflowRun {
    if (props.workNodeConfigs.length === 0) {
      throw new RuntimeInvariantViolationError('WorkflowRun', 'Must have at least one work node config');
    }
    const id = WorkflowRunId.generate();
    const run = new WorkflowRun({
      id,
      workflowId: props.workflowId,
      issueKey: props.issueKey,
      seedValues: props.seedValues ?? {},
      status: WorkflowRunStatus.INITIALIZED,
      currentWorkIndex: 0,
      cancelledAtWorkIndex: null,
      cancellationReason: null,
      workExecutionIds: [],
      gitRefPool: props.gitRefPool,
      mcpServerRefPool: props.mcpServerRefPool,
      workNodeConfigs: props.workNodeConfigs,
      restoredToCheckpoint: false,
    });

    run.addDomainEvent(new WorkflowRunCreated({
      workflowRunId: id,
      workflowId: props.workflowId,
    }));

    return run;
  }

  static fromProps(props: WorkflowRunFromProps): WorkflowRun {
    return new WorkflowRun(props);
  }

  // ===== Getters =====

  get id(): WorkflowRunId { return this._id; }
  get workflowId(): WorkflowId { return this._workflowId; }
  get issueKey(): string { return this._issueKey; }
  get status(): WorkflowRunStatus { return this._status; }
  get currentWorkIndex(): number { return this._currentWorkIndex; }
  get cancelledAtWorkIndex(): number | null { return this._cancelledAtWorkIndex; }
  get cancellationReason(): string | null { return this._cancellationReason; }
  get workExecutionIds(): ReadonlyArray<WorkExecutionId> { return [...this._workExecutionIds]; }
  get gitRefPool(): readonly GitRefNodeConfig[] { return this._gitRefPool; }
  get mcpServerRefPool(): readonly McpServerRefNodeConfig[] { return this._mcpServerRefPool; }
  get workNodeConfigs(): readonly WorkNodeConfig[] { return [...this._workNodeConfigs]; }
  get restoredToCheckpoint(): boolean { return this._restoredToCheckpoint; }
  get seedValues(): Readonly<Record<string, string>> { return this._seedValues; }
  get totalWorkCount(): number { return this._workNodeConfigs.length; }

  get currentWorkExecutionId(): WorkExecutionId | null {
    return this._workExecutionIds[this._currentWorkIndex] ?? null;
  }

  getWorkNodeConfig(sequence: number): WorkNodeConfig | null {
    return this._workNodeConfigs.find((c) => c.sequence === sequence) ?? null;
  }

  // ===== State Transitions =====

  start(): void {
    if (this._status !== WorkflowRunStatus.INITIALIZED) {
      throw new RuntimeInvalidStateTransitionError('WorkflowRun', this._status, WorkflowRunStatus.RUNNING);
    }
    this._status = WorkflowRunStatus.RUNNING;
    this._currentWorkIndex = 0;
    this._restoredToCheckpoint = false;
    this.incrementVersion();
    this.addDomainEvent(new WorkflowRunStarted({ workflowRunId: this._id }));
  }

  advanceWork(): boolean {
    if (this._status !== WorkflowRunStatus.RUNNING) {
      throw new RuntimeInvalidStateTransitionError('WorkflowRun', this._status, 'advanceWork');
    }
    this._currentWorkIndex++;
    this.incrementVersion();
    if (this._currentWorkIndex >= this._workNodeConfigs.length) {
      this._status = WorkflowRunStatus.COMPLETED;
      this.addDomainEvent(new WorkflowRunCompleted({ workflowRunId: this._id }));
      return false;
    }
    return true;
  }

  pause(): void {
    if (this._status !== WorkflowRunStatus.RUNNING) {
      throw new RuntimeInvalidStateTransitionError('WorkflowRun', this._status, WorkflowRunStatus.PAUSED);
    }
    this._status = WorkflowRunStatus.PAUSED;
    this.incrementVersion();
    this.addDomainEvent(new WorkflowRunPaused({ workflowRunId: this._id }));
  }

  await(): void {
    if (this._status !== WorkflowRunStatus.RUNNING) {
      throw new RuntimeInvalidStateTransitionError('WorkflowRun', this._status, WorkflowRunStatus.AWAITING);
    }
    this._status = WorkflowRunStatus.AWAITING;
    this.incrementVersion();
    this.addDomainEvent(new WorkflowRunAwaiting({ workflowRunId: this._id }));
  }

  resume(): void {
    if (this._status !== WorkflowRunStatus.PAUSED && this._status !== WorkflowRunStatus.AWAITING) {
      throw new RuntimeInvalidStateTransitionError('WorkflowRun', this._status, WorkflowRunStatus.RUNNING);
    }
    this._status = WorkflowRunStatus.RUNNING;
    this._restoredToCheckpoint = false;
    this.incrementVersion();
    this.addDomainEvent(new WorkflowRunResumed({ workflowRunId: this._id }));
  }

  cancel(reason?: string): void {
    if (this.isTerminal()) {
      throw new RuntimeInvalidStateTransitionError('WorkflowRun', this._status, WorkflowRunStatus.CANCELLED);
    }
    this._cancelledAtWorkIndex = this._currentWorkIndex;
    this._cancellationReason = reason ?? null;
    this._status = WorkflowRunStatus.CANCELLED;
    this.incrementVersion();
    this.addDomainEvent(new WorkflowRunCancelled({ workflowRunId: this._id, reason }));
  }

  // ===== Checkpoint Restore =====

  restoreToCheckpoint(workSequence: number): void {
    if (this._status !== WorkflowRunStatus.PAUSED
      && this._status !== WorkflowRunStatus.AWAITING
      && this._status !== WorkflowRunStatus.CANCELLED
      && this._status !== WorkflowRunStatus.COMPLETED) {
      throw new RuntimeInvalidStateTransitionError('WorkflowRun', this._status, 'restoreToCheckpoint');
    }
    if (workSequence < 0 || workSequence >= this._workNodeConfigs.length) {
      throw new RuntimeInvariantViolationError('WorkflowRun', `Invalid work sequence for restore: ${workSequence}`);
    }
    this._currentWorkIndex = workSequence;
    this._status = WorkflowRunStatus.PAUSED;
    this._restoredToCheckpoint = true;
    this._workExecutionIds = this._workExecutionIds.slice(0, workSequence);
    this.incrementVersion();
  }

  // ===== Work Management =====

  addWorkExecution(id: WorkExecutionId): void {
    if (this._workExecutionIds.includes(id)) {
      throw new RuntimeInvariantViolationError('WorkflowRun', `WorkExecution ${id} already exists`);
    }
    this._workExecutionIds.push(id);
    this.incrementVersion();
  }

  // ===== Work Node Config Editing =====

  isEditable(): boolean {
    return this._status === WorkflowRunStatus.INITIALIZED
      || this._status === WorkflowRunStatus.RUNNING
      || this._status === WorkflowRunStatus.PAUSED
      || this._status === WorkflowRunStatus.AWAITING
      || this._status === WorkflowRunStatus.CANCELLED
      || this._status === WorkflowRunStatus.COMPLETED;
  }

  editableFromSequence(): number {
    if (this._status === WorkflowRunStatus.INITIALIZED) return 0;
    if (this._status === WorkflowRunStatus.RUNNING) {
      return this._currentWorkIndex + 1;
    }
    if (this._status === WorkflowRunStatus.PAUSED
      || this._status === WorkflowRunStatus.AWAITING) {
      return this._currentWorkIndex;
    }
    return this._restoredToCheckpoint
      ? this._currentWorkIndex
      : this._currentWorkIndex + 1;
  }

  canEditWorkNode(sequence: number): boolean {
    return this.isEditable() && sequence >= this.editableFromSequence();
  }

  updateWorkNodeConfig(sequence: number, updatedConfig: WorkNodeConfig): void {
    if (!this.canEditWorkNode(sequence)) {
      throw new RuntimeInvariantViolationError('WorkflowRun', `Cannot edit work node at sequence ${sequence}`);
    }
    this.validateGitRefsInPool(updatedConfig.gitRefConfigs);
    this.validateMcpServerRefsInPool(updatedConfig.mcpServerRefConfigs);

    const index = this._workNodeConfigs.findIndex((c) => c.sequence === sequence);
    if (index === -1) {
      throw new RuntimeInvariantViolationError('WorkflowRun', `Work node config at sequence ${sequence} not found`);
    }
    this._workNodeConfigs[index] = updatedConfig.withSequence(sequence);
    this.incrementVersion();
    this.addDomainEvent(new WorkNodeConfigUpdated({ workflowRunId: this._id, sequence }));
  }

  addWorkNodeConfig(config: WorkNodeConfig): void {
    if (!this.isEditable()) {
      throw new RuntimeInvariantViolationError('WorkflowRun', 'Cannot add work node in current state');
    }
    this.validateGitRefsInPool(config.gitRefConfigs);
    this.validateMcpServerRefsInPool(config.mcpServerRefConfigs);

    const newSequence = this._workNodeConfigs.length;
    this._workNodeConfigs.push(config.withSequence(newSequence));
    this.incrementVersion();
    this.addDomainEvent(new WorkNodeAdded({ workflowRunId: this._id, sequence: newSequence }));
  }

  removeWorkNodeConfig(sequence: number): void {
    if (!this.canEditWorkNode(sequence)) {
      throw new RuntimeInvariantViolationError('WorkflowRun', `Cannot remove work node at sequence ${sequence}`);
    }
    if (this._workNodeConfigs.length <= 1) {
      throw new RuntimeInvariantViolationError('WorkflowRun', 'Must have at least one work node');
    }
    this._workNodeConfigs = this._workNodeConfigs
      .filter((c) => c.sequence !== sequence)
      .map((c, i) => c.withSequence(i));
    this.incrementVersion();
    this.addDomainEvent(new WorkNodeRemoved({ workflowRunId: this._id, sequence }));
  }

  // ===== Resource Pool Validation =====

  private validateGitRefsInPool(refs: readonly GitRefNodeConfig[]): void {
    const poolGitIds = new Set(this._gitRefPool.map((r) => r.gitId));
    for (const ref of refs) {
      if (!poolGitIds.has(ref.gitId)) {
        throw new RuntimeInvariantViolationError('WorkflowRun', `GitId ${ref.gitId} not in resource pool`);
      }
    }
  }

  private validateMcpServerRefsInPool(refs: readonly McpServerRefNodeConfig[]): void {
    const poolMcpIds = new Set(this._mcpServerRefPool.map((r) => r.mcpServerId));
    for (const ref of refs) {
      if (!poolMcpIds.has(ref.mcpServerId)) {
        throw new RuntimeInvariantViolationError('WorkflowRun', `McpServerId ${ref.mcpServerId} not in resource pool`);
      }
    }
  }

  // ===== Query Methods =====

  isTerminal(): boolean {
    return this._status === WorkflowRunStatus.COMPLETED || this._status === WorkflowRunStatus.CANCELLED;
  }

  canPause(): boolean { return this._status === WorkflowRunStatus.RUNNING; }
  canResume(): boolean { return this._status === WorkflowRunStatus.PAUSED || this._status === WorkflowRunStatus.AWAITING; }
}
