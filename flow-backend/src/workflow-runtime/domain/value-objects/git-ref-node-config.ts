import type { GitId } from '@common/ids/index.js';
import { RuntimeInvariantViolationError } from '../errors/index.js';

export interface GitRefNodeConfigProps {
  readonly gitId: GitId;
  readonly baseBranch: string;
}

export class GitRefNodeConfig {
  private readonly _gitId: GitId;
  private readonly _baseBranch: string;

  private constructor(gitId: GitId, baseBranch: string) {
    this._gitId = gitId;
    this._baseBranch = baseBranch;
  }

  static create(gitId: GitId, baseBranch: string): GitRefNodeConfig {
    if (!baseBranch.trim()) {
      throw new RuntimeInvariantViolationError('GitRefNodeConfig', 'baseBranch cannot be empty');
    }
    return new GitRefNodeConfig(gitId, baseBranch);
  }

  static fromProps(props: GitRefNodeConfigProps): GitRefNodeConfig {
    if (!props.baseBranch.trim()) {
      throw new RuntimeInvariantViolationError('GitRefNodeConfig', 'baseBranch cannot be empty');
    }
    return new GitRefNodeConfig(props.gitId, props.baseBranch);
  }

  get gitId(): GitId { return this._gitId; }
  get baseBranch(): string { return this._baseBranch; }
}
