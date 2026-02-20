import { AggregateRoot } from '@common/aggregate-root.js';
import { WorkTreeId, WorkflowRunId } from '../value-objects/index.js';
import type { GitId } from '@common/ids/index.js';

export interface WorkTreeProps {
  id: WorkTreeId;
  gitId: GitId;
  workflowRunId: WorkflowRunId;
  path: string;
  branch: string;
  version?: number;
}

export interface CreateWorkTreeProps {
  gitId: GitId;
  workflowRunId: WorkflowRunId;
  path: string;
  branch: string;
}

export class WorkTree extends AggregateRoot<WorkTreeId> {
  private readonly _id: WorkTreeId;
  private readonly _gitId: GitId;
  private readonly _workflowRunId: WorkflowRunId;
  private readonly _path: string;
  private readonly _branch: string;

  private constructor(props: WorkTreeProps) {
    super();
    this._id = props.id;
    this._gitId = props.gitId;
    this._workflowRunId = props.workflowRunId;
    this._path = props.path;
    this._branch = props.branch;
    if (props.version !== undefined) this.setVersion(props.version);
  }

  static create(props: CreateWorkTreeProps): WorkTree {
    const id = WorkTreeId.generate();
    return new WorkTree({ id, ...props });
  }

  static fromProps(props: WorkTreeProps): WorkTree {
    return new WorkTree(props);
  }

  get id(): WorkTreeId { return this._id; }
  get gitId(): GitId { return this._gitId; }
  get workflowRunId(): WorkflowRunId { return this._workflowRunId; }
  get path(): string { return this._path; }
  get branch(): string { return this._branch; }
}
