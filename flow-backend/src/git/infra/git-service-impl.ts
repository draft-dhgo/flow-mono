import { Injectable } from '@nestjs/common';
import { GitService } from '@common/ports/index.js';
import type { GitCloneOptions, GitCreateWorktreeOptions } from '@common/ports/index.js';
import { GitClient } from '../domain/ports/git-client.js';

@Injectable()
export class GitServiceImpl extends GitService {
  constructor(private readonly gitClient: GitClient) {
    super();
  }

  async clone(options: GitCloneOptions): Promise<void> {
    await this.gitClient.clone({
      url: options.url,
      localPath: options.localPath,
      branch: options.branch,
    });
  }

  async createWorktree(options: GitCreateWorktreeOptions): Promise<void> {
    await this.gitClient.createWorktree({
      repoPath: options.repoPath,
      worktreePath: options.worktreePath,
      branch: options.baseBranch,
      newBranchName: options.newBranchName,
    });
  }

  async deleteWorktree(repoPath: string, worktreePath: string): Promise<void> {
    await this.gitClient.deleteWorktree(repoPath, worktreePath);
  }

  async deleteRepo(repoPath: string): Promise<void> {
    await this.gitClient.deleteRepo(repoPath);
  }

  async getCurrentCommit(repoPath: string): Promise<string> {
    return this.gitClient.getCurrentCommit(repoPath);
  }

  async reset(repoPath: string, commitHash: string): Promise<void> {
    await this.gitClient.reset(repoPath, commitHash);
  }

  async branchExists(repoPath: string, branch: string): Promise<boolean> {
    return this.gitClient.branchExists(repoPath, branch);
  }

  async deleteBranch(repoPath: string, branch: string): Promise<void> {
    await this.gitClient.deleteBranch(repoPath, branch);
  }

  async fetch(repoPath: string): Promise<void> {
    await this.gitClient.fetch(repoPath);
  }

  async removeWorktreeForBranch(repoPath: string, branch: string): Promise<void> {
    await this.gitClient.removeWorktreeForBranch(repoPath, branch);
  }
}
