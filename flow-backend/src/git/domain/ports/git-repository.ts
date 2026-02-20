import type { Git } from '../entities/git.js';
import type { GitId, GitUrl } from '../value-objects/index.js';

export abstract class GitRepository {
  abstract findById(id: GitId): Promise<Git | null>;
  abstract findByUrl(url: GitUrl): Promise<Git | null>;
  abstract findAll(): Promise<Git[]>;
  abstract findByIds(ids: GitId[]): Promise<Git[]>;
  abstract save(git: Git): Promise<void>;
  abstract delete(id: GitId): Promise<void>;
  abstract exists(id: GitId): Promise<boolean>;
}
