import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import { GitClient } from '../domain/ports/git-client.js';
import type { GitCloneOptions, GitWorktreeOptions } from '../domain/ports/git-client.js';

const execFileAsync = promisify(execFile);

@Injectable()
export class CliGitClient extends GitClient {
  private async exec(cwd: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('git', args, { cwd });
    return stdout;
  }

  async clone(options: GitCloneOptions): Promise<void> {
    const args = ['clone', options.url, options.localPath];
    if (options.branch) {
      args.push('--branch', options.branch);
    }
    await this.exec('.', args);
  }

  async createWorktree(options: GitWorktreeOptions): Promise<void> {
    const args = ['worktree', 'add'];
    if (options.newBranchName) {
      args.push('-b', options.newBranchName);
    }
    args.push(options.worktreePath, options.branch);
    await this.exec(options.repoPath, args);
  }

  async deleteWorktree(repoPath: string, worktreePath: string): Promise<void> {
    await this.exec(repoPath, ['worktree', 'remove', worktreePath, '--force']);
  }

  async createBranch(repoPath: string, branch: string, startPoint?: string): Promise<void> {
    const args = ['branch', branch];
    if (startPoint) {
      args.push(startPoint);
    }
    await this.exec(repoPath, args);
  }

  async deleteBranch(repoPath: string, branch: string): Promise<void> {
    await this.exec(repoPath, ['branch', '-D', branch]);
  }

  async commit(repoPath: string, message: string): Promise<string> {
    await this.exec(repoPath, ['commit', '-m', message]);
    const hash = await this.exec(repoPath, ['rev-parse', 'HEAD']);
    return hash.trim();
  }

  async reset(repoPath: string, commitHash: string): Promise<void> {
    await this.exec(repoPath, ['reset', '--hard', commitHash]);
  }

  async resetToBranch(repoPath: string, branch: string): Promise<void> {
    await this.exec(repoPath, ['reset', '--hard', branch]);
  }

  async hasChanges(repoPath: string): Promise<boolean> {
    const status = await this.exec(repoPath, ['status', '--porcelain']);
    return status.trim().length > 0;
  }

  async getCurrentCommit(repoPath: string): Promise<string> {
    const hash = await this.exec(repoPath, ['rev-parse', 'HEAD']);
    return hash.trim();
  }

  async getCurrentBranch(repoPath: string): Promise<string> {
    const branch = await this.exec(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
    return branch.trim();
  }

  async deleteRepo(repoPath: string): Promise<void> {
    await rm(repoPath, { recursive: true, force: true });
  }

  async branchExists(repoPath: string, branch: string): Promise<boolean> {
    try {
      await this.exec(repoPath, ['rev-parse', '--verify', `refs/heads/${branch}`]);
      return true;
    } catch {
      return false;
    }
  }

  async fetch(repoPath: string): Promise<void> {
    await this.exec(repoPath, ['fetch']);
  }

  async pull(repoPath: string): Promise<void> {
    await this.exec(repoPath, ['pull']);
  }

  async add(repoPath: string, paths: string[]): Promise<void> {
    await this.exec(repoPath, ['add', ...paths]);
  }

  async removeWorktreeForBranch(repoPath: string, branch: string): Promise<void> {
    const output = await this.exec(repoPath, ['worktree', 'list', '--porcelain']);
    const blocks = output.split('\n\n').filter(Boolean);
    for (const block of blocks) {
      if (block.includes(`branch refs/heads/${branch}`)) {
        const pathLine = block.split('\n').find((l) => l.startsWith('worktree '));
        if (pathLine) {
          const worktreePath = pathLine.slice('worktree '.length);
          await this.exec(repoPath, ['worktree', 'remove', worktreePath, '--force']);
          return;
        }
      }
    }
  }
}
