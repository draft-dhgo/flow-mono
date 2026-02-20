export interface GitCloneOptions {
  url: string;
  localPath: string;
  branch?: string;
}

export interface GitWorktreeOptions {
  repoPath: string;
  worktreePath: string;
  branch: string;
  newBranchName?: string;
}

export abstract class GitClient {
  abstract clone(options: GitCloneOptions): Promise<void>;
  abstract createWorktree(options: GitWorktreeOptions): Promise<void>;
  abstract deleteWorktree(repoPath: string, worktreePath: string): Promise<void>;
  abstract createBranch(repoPath: string, branch: string, startPoint?: string): Promise<void>;
  abstract deleteBranch(repoPath: string, branch: string): Promise<void>;
  abstract commit(repoPath: string, message: string): Promise<string>;
  abstract reset(repoPath: string, commitHash: string): Promise<void>;
  abstract resetToBranch(repoPath: string, branch: string): Promise<void>;
  abstract hasChanges(repoPath: string): Promise<boolean>;
  abstract getCurrentCommit(repoPath: string): Promise<string>;
  abstract getCurrentBranch(repoPath: string): Promise<string>;
  abstract deleteRepo(repoPath: string): Promise<void>;
  abstract branchExists(repoPath: string, branch: string): Promise<boolean>;
  abstract fetch(repoPath: string): Promise<void>;
  abstract pull(repoPath: string): Promise<void>;
  abstract add(repoPath: string, paths: string[]): Promise<void>;
  abstract removeWorktreeForBranch(repoPath: string, branch: string): Promise<void>;
}
