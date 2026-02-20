import type { GitId } from '../ids/index.js';

export interface GitInfo {
  readonly id: GitId;
  readonly url: string;
  readonly localPath: string;
}

export abstract class GitReader {
  abstract findByIds(ids: GitId[]): Promise<GitInfo[]>;
}
