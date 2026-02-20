import { AggregateRoot } from '@common/aggregate-root.js';
import { CheckpointId, WorkflowRunId, WorkExecutionId } from '../value-objects/index.js';
import type { CommitHash } from '../value-objects/index.js';
import type { WorkflowId, GitId } from '@common/ids/index.js';
import { CheckpointCreated } from '@common/events/index.js';
import { RuntimeInvariantViolationError } from '../errors/index.js';

export interface CheckpointProps {
  id: CheckpointId;
  workflowRunId: WorkflowRunId;
  workflowId: WorkflowId;
  workExecutionId: WorkExecutionId;
  workSequence: number;
  commitHashes: Map<GitId, CommitHash>;
  createdAt: Date;
  version?: number;
}

export interface CreateCheckpointProps {
  workflowRunId: WorkflowRunId;
  workflowId: WorkflowId;
  workExecutionId: WorkExecutionId;
  workSequence: number;
  commitHashes: Map<GitId, CommitHash>;
}

export class Checkpoint extends AggregateRoot<CheckpointId> {
  private readonly _id: CheckpointId;
  private readonly _workflowRunId: WorkflowRunId;
  private readonly _workflowId: WorkflowId;
  private readonly _workExecutionId: WorkExecutionId;
  private readonly _workSequence: number;
  private readonly _commitHashes: ReadonlyMap<GitId, CommitHash>;
  private readonly _createdAt: Date;

  private constructor(props: CheckpointProps) {
    super();
    this._id = props.id;
    this._workflowRunId = props.workflowRunId;
    this._workflowId = props.workflowId;
    this._workExecutionId = props.workExecutionId;
    this._workSequence = props.workSequence;
    this._commitHashes = new Map(props.commitHashes);
    this._createdAt = props.createdAt;
    if (props.version !== undefined) this.setVersion(props.version);
  }

  static create(props: CreateCheckpointProps): Checkpoint {
    if (props.workSequence < 0) throw new RuntimeInvariantViolationError('Checkpoint', 'workSequence must be >= 0');
    if (props.commitHashes.size === 0) throw new RuntimeInvariantViolationError('Checkpoint', 'commitHashes cannot be empty');

    const id = CheckpointId.generate();
    const createdAt = new Date();
    const checkpoint = new Checkpoint({ id, ...props, createdAt });

    checkpoint.addDomainEvent(new CheckpointCreated({
      checkpointId: id,
      workflowRunId: props.workflowRunId,
      workflowId: props.workflowId,
      workExecutionId: props.workExecutionId,
      workSequence: props.workSequence,
    }));

    return checkpoint;
  }

  static fromProps(props: CheckpointProps): Checkpoint {
    if (props.workSequence < 0) throw new RuntimeInvariantViolationError('Checkpoint', 'workSequence must be >= 0');
    if (props.commitHashes.size === 0) throw new RuntimeInvariantViolationError('Checkpoint', 'commitHashes cannot be empty');
    return new Checkpoint(props);
  }

  get id(): CheckpointId { return this._id; }
  get workflowRunId(): WorkflowRunId { return this._workflowRunId; }
  get workflowId(): WorkflowId { return this._workflowId; }
  get workExecutionId(): WorkExecutionId { return this._workExecutionId; }
  get workSequence(): number { return this._workSequence; }
  get commitHashes(): ReadonlyMap<GitId, CommitHash> { return this._commitHashes; }
  get createdAt(): Date { return new Date(this._createdAt.getTime()); }

  getCommitHash(gitId: GitId): CommitHash | undefined { return this._commitHashes.get(gitId); }
}
