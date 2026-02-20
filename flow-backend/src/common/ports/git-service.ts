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

export abstract class GitService {
  abstract clone(options: GitCloneOptions): Promise<void>;
  abstract createWorktree(options: GitCreateWorktreeOptions): Promise<void>;
  abstract deleteWorktree(repoPath: string, worktreePath: string): Promise<void>;
  abstract deleteRepo(repoPath: string): Promise<void>;
  abstract getCurrentCommit(repoPath: string): Promise<string>;
  abstract reset(repoPath: string, commitHash: string): Promise<void>;
  abstract branchExists(repoPath: string, branch: string): Promise<boolean>;
  abstract deleteBranch(repoPath: string, branch: string): Promise<void>;
  abstract fetch(repoPath: string): Promise<void>;
  abstract removeWorktreeForBranch(repoPath: string, branch: string): Promise<void>;
}
