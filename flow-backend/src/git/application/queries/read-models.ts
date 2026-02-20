import type { GitId } from '@common/ids/index.js';

export interface GitReadModel {
  readonly id: GitId;
  readonly url: string;
  readonly localPath: string;
}
