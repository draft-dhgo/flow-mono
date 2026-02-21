import type { GitId } from '@common/ids/index.js';
import { WorkspaceInvariantViolationError } from '../errors/index.js';

export interface WorkspaceGitRefProps {
  readonly gitId: GitId;
  readonly baseBranch: string;
  readonly branchName: string;
}

export class WorkspaceGitRef {
  private readonly _gitId: GitId;
  private readonly _baseBranch: string;
  private readonly _branchName: string;

  private constructor(gitId: GitId, baseBranch: string, branchName: string) {
    this._gitId = gitId;
    this._baseBranch = baseBranch;
    this._branchName = branchName;
  }

  static create(props: WorkspaceGitRefProps): WorkspaceGitRef {
    if (!props.baseBranch.trim()) {
      throw new WorkspaceInvariantViolationError('WorkspaceGitRef', 'baseBranch cannot be empty');
    }
    if (!props.branchName.trim()) {
      throw new WorkspaceInvariantViolationError('WorkspaceGitRef', 'branchName cannot be empty');
    }
    return new WorkspaceGitRef(props.gitId, props.baseBranch, props.branchName);
  }

  get gitId(): GitId {
    return this._gitId;
  }

  get baseBranch(): string {
    return this._baseBranch;
  }

  get branchName(): string {
    return this._branchName;
  }
}
