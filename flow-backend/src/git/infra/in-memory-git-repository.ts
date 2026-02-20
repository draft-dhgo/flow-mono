import type { Git } from '../domain/entities/git.js';
import type { GitId, GitUrl } from '../domain/value-objects/index.js';
import { GitRepository } from '../domain/ports/git-repository.js';

export class InMemoryGitRepository extends GitRepository {
  private readonly store = new Map<GitId, Git>();

  async findById(id: GitId): Promise<Git | null> {
    return this.store.get(id) ?? null;
  }

  async findByUrl(url: GitUrl): Promise<Git | null> {
    for (const git of this.store.values()) {
      if ((git.url as string) === (url as string)) {
        return git;
      }
    }
    return null;
  }

  async findAll(): Promise<Git[]> {
    return [...this.store.values()];
  }

  async findByIds(ids: GitId[]): Promise<Git[]> {
    return ids.map((id) => this.store.get(id)).filter((g): g is Git => g !== undefined);
  }

  async save(git: Git): Promise<void> {
    this.store.set(git.id, git);
  }

  async delete(id: GitId): Promise<void> {
    this.store.delete(id);
  }

  async exists(id: GitId): Promise<boolean> {
    return this.store.has(id);
  }
}
