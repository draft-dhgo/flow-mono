import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { GitClient } from '../domain/ports/git-client.js';
import type { GitCloneOptions, GitLogEntry, GitWorktreeOptions } from '../domain/ports/git-client.js';

const execFileAsync = promisify(execFile);

@Injectable()
export class CliGitClient extends GitClient {
  private reposBasePath: string | null = null;

  /** deleteRepo 경로 검증용 basePath 설정 */
  setReposBasePath(basePath: string): void {
    this.reposBasePath = basePath;
  }

  private async exec(cwd: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('git', args, { cwd });
    return stdout;
  }

  async clone(options: GitCloneOptions): Promise<void> {
    const args = ['clone'];
    if (options.branch) {
      args.push('--branch', options.branch);
    }
    // '--' 구분자로 argument injection 방어
    args.push('--', options.url, options.localPath);
    await this.exec('.', args);
  }

  async createWorktree(options: GitWorktreeOptions): Promise<void> {
    const args = ['worktree', 'add'];
    if (options.newBranchName) {
      args.push('-b', options.newBranchName);
    }
    args.push('--', options.worktreePath, options.branch);
    await this.exec(options.repoPath, args);
  }

  async deleteWorktree(repoPath: string, worktreePath: string): Promise<void> {
    await this.exec(repoPath, ['worktree', 'remove', '--force', '--', worktreePath]);
  }

  async createBranch(repoPath: string, branch: string, startPoint?: string): Promise<void> {
    const args = ['branch', '--', branch];
    if (startPoint) {
      args.push(startPoint);
    }
    await this.exec(repoPath, args);
  }

  async deleteBranch(repoPath: string, branch: string): Promise<void> {
    await this.exec(repoPath, ['branch', '-D', '--', branch]);
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
    // 경로 검증: basePath 내부인지 확인하여 임의 경로 삭제 방지
    if (this.reposBasePath) {
      const resolved = resolve(repoPath);
      const base = resolve(this.reposBasePath);
      if (!resolved.startsWith(base + '/') && resolved !== base) {
        throw new Error(`Refusing to delete path outside repos base: ${repoPath}`);
      }
    }
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
    await this.exec(repoPath, ['add', '--', ...paths]);
  }

  async removeWorktreeForBranch(repoPath: string, branch: string): Promise<void> {
    const output = await this.exec(repoPath, ['worktree', 'list', '--porcelain']);
    const blocks = output.split('\n\n').filter(Boolean);
    for (const block of blocks) {
      if (block.includes(`branch refs/heads/${branch}`)) {
        const pathLine = block.split('\n').find((l) => l.startsWith('worktree '));
        if (pathLine) {
          const worktreePath = pathLine.slice('worktree '.length);
          await this.exec(repoPath, ['worktree', 'remove', '--force', '--', worktreePath]);
          return;
        }
      }
    }
  }

  async push(repoPath: string, branch: string): Promise<void> {
    // Temporarily rename pre-push hook to bypass it (FlowFlow UI-initiated push)
    const gitDir = await this.resolveGitDir(repoPath);
    const hookPath = join(gitDir, 'hooks', 'pre-push');
    const backupPath = hookPath + '.bak';
    let hookExists = false;
    try {
      await rename(hookPath, backupPath);
      hookExists = true;
    } catch {
      // Hook does not exist — no bypass needed
    }
    try {
      await this.exec(repoPath, ['push', 'origin', '--', branch]);
    } finally {
      if (hookExists) {
        try {
          await rename(backupPath, hookPath);
        } catch {
          // Best-effort restore
        }
      }
    }
  }

  private async resolveGitDir(repoPath: string): Promise<string> {
    const gitPath = join(repoPath, '.git');
    try {
      const content = await readFile(gitPath, 'utf-8');
      if (content.startsWith('gitdir:')) {
        return content.replace('gitdir:', '').trim();
      }
    } catch {
      // Not a worktree — use default .git directory
    }
    return gitPath;
  }

  async installPrePushHook(worktreePath: string): Promise<void> {
    const gitFileContent = await readFile(join(worktreePath, '.git'), 'utf-8');
    let gitDir: string;
    if (gitFileContent.startsWith('gitdir:')) {
      gitDir = gitFileContent.replace('gitdir:', '').trim();
    } else {
      gitDir = join(worktreePath, '.git');
    }

    const hooksDir = join(gitDir, 'hooks');
    await mkdir(hooksDir, { recursive: true });

    const hookPath = join(hooksDir, 'pre-push');
    const hookContent = [
      '#!/bin/sh',
      '# FlowFlow: 에이전트의 원격 푸시를 차단합니다.',
      'echo "ERROR: 원격 푸시가 차단되었습니다. FlowFlow UI를 통해 푸시하세요." >&2',
      'exit 1',
    ].join('\n');
    await writeFile(hookPath, hookContent, { mode: 0o755 });
  }

  async unsetUpstream(repoPath: string, branch: string): Promise<void> {
    try {
      await this.exec(repoPath, ['branch', '--unset-upstream', '--', branch]);
    } catch {
      // upstream이 설정되지 않은 경우 에러 발생 — 정상 동작
    }
  }

  async getCommitCount(repoPath: string, baseBranch: string): Promise<number> {
    const output = await this.exec(repoPath, ['rev-list', '--count', baseBranch + '..HEAD']);
    return parseInt(output.trim(), 10);
  }

  async getLog(repoPath: string, baseBranch: string, maxCount: number): Promise<GitLogEntry[]> {
    const format = '--format=%H|||%s|||%an|||%aI';
    const output = await this.exec(repoPath, [
      'log',
      format,
      baseBranch + '..HEAD',
      '-n',
      String(maxCount),
    ]);
    const lines = output.trim().split('\n').filter(Boolean);
    return lines.map((line) => {
      const parts = line.split('|||');
      return {
        hash: parts[0] ?? '',
        message: parts[1] ?? '',
        author: parts[2] ?? '',
        date: parts[3] ?? '',
      };
    });
  }

  async diff(repoPath: string, baseBranch: string): Promise<string[]> {
    const output = await this.exec(repoPath, ['diff', '--name-only', baseBranch + '...HEAD']);
    return output.trim().split('\n').filter(Boolean);
  }

  async getFileAtRef(repoPath: string, ref: string, filePath: string): Promise<string> {
    return this.exec(repoPath, ['show', ref + ':' + filePath]);
  }

  async merge(repoPath: string, branch: string): Promise<void> {
    await this.exec(repoPath, ['merge', '--no-edit', '--', branch]);
  }

  async createReadOnlyWorktree(repoPath: string, worktreePath: string, ref: string): Promise<void> {
    await this.exec(repoPath, ['worktree', 'add', '--detach', '--', worktreePath, ref]);
  }
}
