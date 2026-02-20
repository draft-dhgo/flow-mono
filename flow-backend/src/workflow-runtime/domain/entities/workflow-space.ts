import { AggregateRoot } from '@common/aggregate-root.js';
import { WorkflowSpaceId, WorkflowRunId, WorkExecutionId } from '../value-objects/index.js';
import { RuntimeInvariantViolationError } from '../errors/index.js';
import { WorkSpace } from './work-space.js';

export interface WorkflowSpaceProps {
  id: WorkflowSpaceId;
  workflowRunId: WorkflowRunId;
  path: string;
  workSpaces: WorkSpace[];
  version?: number;
}

export interface CreateWorkflowSpaceProps {
  workflowRunId: WorkflowRunId;
  path: string;
}

export class WorkflowSpace extends AggregateRoot<WorkflowSpaceId> {
  private readonly _id: WorkflowSpaceId;
  private readonly _workflowRunId: WorkflowRunId;
  private readonly _path: string;
  private _workSpaces: WorkSpace[];

  private constructor(props: WorkflowSpaceProps) {
    super();
    this._id = props.id;
    this._workflowRunId = props.workflowRunId;
    this._path = props.path;
    this._workSpaces = [...props.workSpaces];
    if (props.version !== undefined) this.setVersion(props.version);
  }

  static create(props: CreateWorkflowSpaceProps): WorkflowSpace {
    const id = WorkflowSpaceId.generate();
    return new WorkflowSpace({ id, workflowRunId: props.workflowRunId, path: props.path, workSpaces: [] });
  }

  static fromProps(props: WorkflowSpaceProps): WorkflowSpace { return new WorkflowSpace(props); }

  get id(): WorkflowSpaceId { return this._id; }
  get workflowRunId(): WorkflowRunId { return this._workflowRunId; }
  get path(): string { return this._path; }
  get workSpaces(): readonly WorkSpace[] { return this._workSpaces; }

  addWorkSpace(workSpace: WorkSpace): void {
    const exists = this._workSpaces.some((ws) => ws.workExecutionId === workSpace.workExecutionId);
    if (exists) {
      throw new RuntimeInvariantViolationError(
        'WorkflowSpace',
        `WorkSpace for WorkExecution ${workSpace.workExecutionId} already exists`,
      );
    }
    this._workSpaces.push(workSpace);
  }

  removeWorkSpacesByExecutionIds(executionIds: ReadonlyArray<WorkExecutionId>): WorkSpace[] {
    const idSet = new Set<WorkExecutionId>(executionIds);
    const removed: WorkSpace[] = [];
    this._workSpaces = this._workSpaces.filter((ws) => {
      if (idSet.has(ws.workExecutionId)) {
        removed.push(ws);
        return false;
      }
      return true;
    });
    return removed;
  }
}
