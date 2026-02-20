import type { GitId } from '../ids/index.js';

export interface GitRefInfo {
  readonly id: GitId;
}

export abstract class GitReferenceChecker {
  abstract findByIds(ids: GitId[]): Promise<GitRefInfo[]>;
}
