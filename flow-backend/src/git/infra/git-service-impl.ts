import { Injectable } from '@nestjs/common';
import { GitService } from '@common/ports/index.js';
import type { GitCloneOptions, GitCreateWorktreeOptions } from '@common/ports/index.js';
import { GitClient } from '../domain/ports/git-client.js';
import type { GitLogEntry } from '../domain/ports/git-client.js';

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

  async getCurrentBranch(repoPath: string): Promise<string> {
    return this.gitClient.getCurrentBranch(repoPath);
  }

  async push(repoPath: string, branch: string): Promise<void> {
    await this.gitClient.push(repoPath, branch);
  }

  async installPrePushHook(worktreePath: string): Promise<void> {
    await this.gitClient.installPrePushHook(worktreePath);
  }

  async unsetUpstream(repoPath: string, branch: string): Promise<void> {
    await this.gitClient.unsetUpstream(repoPath, branch);
  }

  async getCommitCount(repoPath: string, baseBranch: string): Promise<number> {
    return this.gitClient.getCommitCount(repoPath, baseBranch);
  }

  async getLog(repoPath: string, baseBranch: string, maxCount: number): Promise<GitLogEntry[]> {
    return this.gitClient.getLog(repoPath, baseBranch, maxCount);
  }

  async diff(repoPath: string, baseBranch: string): Promise<string[]> {
    return this.gitClient.diff(repoPath, baseBranch);
  }

  async getFileAtRef(repoPath: string, ref: string, filePath: string): Promise<string> {
    return this.gitClient.getFileAtRef(repoPath, ref, filePath);
  }

  async merge(repoPath: string, branch: string): Promise<void> {
    await this.gitClient.merge(repoPath, branch);
  }

  async createReadOnlyWorktree(repoPath: string, worktreePath: string, ref: string): Promise<void> {
    await this.gitClient.createReadOnlyWorktree(repoPath, worktreePath, ref);
  }
}
