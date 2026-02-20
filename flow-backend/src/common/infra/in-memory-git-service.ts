import { GitService } from '@common/ports/index.js';
import type { GitCloneOptions, GitCreateWorktreeOptions } from '@common/ports/index.js';

export class InMemoryGitService extends GitService {
  private readonly repos = new Map<string, { url: string; branch?: string }>();
  private readonly commits = new Map<string, string>();

  async clone(options: GitCloneOptions): Promise<void> {
    this.repos.set(options.localPath, { url: options.url, branch: options.branch });
    this.commits.set(options.localPath, 'a'.repeat(40));
  }

  async createWorktree(_options: GitCreateWorktreeOptions): Promise<void> {
    // no-op for in-memory
  }

  async deleteWorktree(_repoPath: string, _worktreePath: string): Promise<void> {
    // no-op for in-memory
  }

  async deleteRepo(repoPath: string): Promise<void> {
    this.repos.delete(repoPath);
    this.commits.delete(repoPath);
  }

  async getCurrentCommit(repoPath: string): Promise<string> {
    return this.commits.get(repoPath) ?? '0'.repeat(40);
  }

  async reset(repoPath: string, commitHash: string): Promise<void> {
    this.commits.set(repoPath, commitHash);
  }

  async branchExists(_repoPath: string, _branch: string): Promise<boolean> {
    return false;
  }

  async deleteBranch(_repoPath: string, _branch: string): Promise<void> {
    // no-op for in-memory
  }

  async fetch(_repoPath: string): Promise<void> {
    // no-op for in-memory
  }

  async removeWorktreeForBranch(_repoPath: string, _branch: string): Promise<void> {
    // no-op for in-memory
  }
}
