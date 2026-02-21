export interface GitCloneOptions {
  readonly url: string;
  readonly localPath: string;
  readonly branch?: string;
}

export interface GitCreateWorktreeOptions {
  readonly repoPath: string;
  readonly worktreePath: string;
  readonly baseBranch: string;
  readonly newBranchName: string;
}

export type { GitLogEntry } from '../../git/domain/ports/git-client.js';

export abstract class GitService {
  abstract clone(options: GitCloneOptions): Promise<void>;
  abstract createWorktree(options: GitCreateWorktreeOptions): Promise<void>;
  abstract deleteWorktree(repoPath: string, worktreePath: string): Promise<void>;
  abstract deleteRepo(repoPath: string): Promise<void>;
  abstract getCurrentCommit(repoPath: string): Promise<string>;
  abstract getCurrentBranch(repoPath: string): Promise<string>;
  abstract reset(repoPath: string, commitHash: string): Promise<void>;
  abstract branchExists(repoPath: string, branch: string): Promise<boolean>;
  abstract deleteBranch(repoPath: string, branch: string): Promise<void>;
  abstract fetch(repoPath: string): Promise<void>;
  abstract removeWorktreeForBranch(repoPath: string, branch: string): Promise<void>;
  abstract push(repoPath: string, branch: string): Promise<void>;
  abstract installPrePushHook(worktreePath: string): Promise<void>;
  abstract unsetUpstream(repoPath: string, branch: string): Promise<void>;
  abstract getCommitCount(repoPath: string, baseBranch: string): Promise<number>;
  abstract getLog(
    repoPath: string,
    baseBranch: string,
    maxCount: number,
  ): Promise<import('../../git/domain/ports/git-client.js').GitLogEntry[]>;
  abstract diff(repoPath: string, baseBranch: string): Promise<string[]>;
  abstract getFileAtRef(repoPath: string, ref: string, filePath: string): Promise<string>;
  abstract merge(repoPath: string, branch: string): Promise<void>;
  abstract createReadOnlyWorktree(repoPath: string, worktreePath: string, ref: string): Promise<void>;
}
