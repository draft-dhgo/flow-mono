import type { GitId } from '@common/ids/index.js';
import { BranchName } from './branch-name.js';

export class GitRef {
  private readonly _gitId: GitId;
  private readonly _baseBranch: BranchName;
  private readonly _valid: boolean;

  private constructor(gitId: GitId, baseBranch: BranchName, valid: boolean) {
    this._gitId = gitId;
    this._baseBranch = baseBranch;
    this._valid = valid;
  }

  static create(gitId: GitId, baseBranch: string): GitRef {
    return new GitRef(gitId, BranchName.create(baseBranch), true);
  }

  static fromProps(gitId: GitId, baseBranch: BranchName, valid: boolean = true): GitRef {
    return new GitRef(gitId, baseBranch, valid);
  }

  static invalidate(ref: GitRef): GitRef {
    return new GitRef(ref._gitId, ref._baseBranch, false);
  }

  get gitId(): GitId {
    return this._gitId;
  }

  get baseBranch(): BranchName {
    return this._baseBranch;
  }

  get valid(): boolean {
    return this._valid;
  }
}
