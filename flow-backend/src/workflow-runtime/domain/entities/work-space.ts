import { WorkSpaceId, WorkExecutionId } from '../value-objects/index.js';
import { SymLink } from '../value-objects/index.js';

export interface WorkSpaceProps {
  id: WorkSpaceId;
  workExecutionId: WorkExecutionId;
  path: string;
  links: SymLink[];
}

export interface CreateWorkSpaceProps {
  workExecutionId: WorkExecutionId;
  path: string;
}

export class WorkSpace {
  private readonly _id: WorkSpaceId;
  private readonly _workExecutionId: WorkExecutionId;
  private readonly _path: string;
  private _links: SymLink[];

  private constructor(props: WorkSpaceProps) {
    this._id = props.id;
    this._workExecutionId = props.workExecutionId;
    this._path = props.path;
    this._links = [...props.links];
  }

  static create(props: CreateWorkSpaceProps): WorkSpace {
    const id = WorkSpaceId.generate();
    return new WorkSpace({ id, workExecutionId: props.workExecutionId, path: props.path, links: [] });
  }

  static fromProps(props: WorkSpaceProps): WorkSpace { return new WorkSpace(props); }

  get id(): WorkSpaceId { return this._id; }
  get workExecutionId(): WorkExecutionId { return this._workExecutionId; }
  get path(): string { return this._path; }
  get links(): readonly SymLink[] { return this._links; }

  addLink(link: SymLink): void {
    this._links.push(link);
  }
}
