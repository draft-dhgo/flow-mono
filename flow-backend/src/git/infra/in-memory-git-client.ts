import { v4 as uuidv4 } from 'uuid';
import { GitClient } from '../domain/ports/git-client.js';
import type { GitCloneOptions, GitWorktreeOptions } from '../domain/ports/git-client.js';

export class InMemoryGitClient extends GitClient {
  private readonly repos = new Map<string, { url: string; branch: string; commits: string[] }>();
  private readonly worktrees = new Map<string, { repoPath: string; branch: string }>();
  private readonly branches = new Map<string, Set<string>>();
  private readonly staged = new Map<string, Set<string>>();

  async clone(options: GitCloneOptions): Promise<void> {
    const defaultBranch = options.branch ?? 'main';
    const initialCommit = uuidv4().replace(/-/g, '') + '00000000';
    this.repos.set(options.localPath, {
      url: options.url,
      branch: defaultBranch,
      commits: [initialCommit],
    });
    this.branches.set(options.localPath, new Set([defaultBranch]));
  }

  async createWorktree(options: GitWorktreeOptions): Promise<void> {
    if (options.newBranchName) {
      const repoBranches = this.branches.get(options.repoPath) ?? new Set();
      repoBranches.add(options.newBranchName);
      this.branches.set(options.repoPath, repoBranches);
    }
    this.worktrees.set(options.worktreePath, {
      repoPath: options.repoPath,
      branch: options.newBranchName ?? options.branch,
    });
  }

  async deleteWorktree(_repoPath: string, worktreePath: string): Promise<void> {
    this.worktrees.delete(worktreePath);
  }

  async createBranch(repoPath: string, branch: string, _startPoint?: string): Promise<void> {
    const repoBranches = this.branches.get(repoPath) ?? new Set();
    repoBranches.add(branch);
    this.branches.set(repoPath, repoBranches);
  }

  async deleteBranch(repoPath: string, branch: string): Promise<void> {
    const repoBranches = this.branches.get(repoPath);
    if (repoBranches) {
      repoBranches.delete(branch);
    }
  }

  async commit(repoPath: string, _message: string): Promise<string> {
    const repo = this.repos.get(repoPath);
    const hash = uuidv4().replace(/-/g, '') + '00000000';
    if (repo) {
      repo.commits.push(hash);
    }
    this.staged.delete(repoPath);
    return hash;
  }

  async reset(repoPath: string, commitHash: string): Promise<void> {
    const repo = this.repos.get(repoPath);
    if (repo) {
      const idx = repo.commits.indexOf(commitHash);
      if (idx >= 0) {
        repo.commits.length = idx + 1;
      }
    }
  }

  async resetToBranch(repoPath: string, _branch: string): Promise<void> {
    const repo = this.repos.get(repoPath);
    if (repo) {
      const hash = uuidv4().replace(/-/g, '') + '00000000';
      repo.commits.push(hash);
    }
  }

  async hasChanges(_repoPath: string): Promise<boolean> {
    return false;
  }

  async getCurrentCommit(repoPath: string): Promise<string> {
    const repo = this.repos.get(repoPath);
    if (!repo || repo.commits.length === 0) {
      return '0'.repeat(40);
    }
    return repo.commits[repo.commits.length - 1];
  }

  async getCurrentBranch(repoPath: string): Promise<string> {
    const repo = this.repos.get(repoPath);
    return repo?.branch ?? 'main';
  }

  async deleteRepo(repoPath: string): Promise<void> {
    this.repos.delete(repoPath);
    this.branches.delete(repoPath);
    this.staged.delete(repoPath);
  }

  async branchExists(repoPath: string, branch: string): Promise<boolean> {
    const repoBranches = this.branches.get(repoPath);
    return repoBranches?.has(branch) ?? false;
  }

  async fetch(_repoPath: string): Promise<void> {
    // no-op
  }

  async pull(_repoPath: string): Promise<void> {
    // no-op
  }

  async add(repoPath: string, paths: string[]): Promise<void> {
    const current = this.staged.get(repoPath) ?? new Set();
    for (const p of paths) {
      current.add(p);
    }
    this.staged.set(repoPath, current);
  }

  async removeWorktreeForBranch(_repoPath: string, _branch: string): Promise<void> {
    // no-op for in-memory
  }
}
