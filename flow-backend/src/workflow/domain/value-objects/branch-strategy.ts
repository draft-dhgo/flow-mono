import { BranchName } from './branch-name.js';

export class BranchStrategy {
  private readonly _workBranch: BranchName;

  private constructor(workBranch: BranchName) {
    this._workBranch = workBranch;
  }

  static create(workBranch: string): BranchStrategy {
    return new BranchStrategy(BranchName.create(workBranch));
  }

  static fromProps(workBranch: BranchName): BranchStrategy {
    return new BranchStrategy(workBranch);
  }

  get workBranch(): BranchName {
    return this._workBranch;
  }
}
