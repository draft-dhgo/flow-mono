import { DomainError } from '@common/errors/index.js';

export class GitDomainError extends DomainError {
  constructor(code: string, message: string, isTransient: boolean = false) {
    super(code, message, isTransient);
  }
}

export class GitInvariantViolationError extends GitDomainError {
  constructor(message: string) {
    super('GIT_INVARIANT_VIOLATION', message);
  }
}

export class GitEntityNotFoundError extends GitDomainError {
  constructor(id: string) {
    super('GIT_NOT_FOUND', `Git repository not found: ${id}`);
  }
}

export class GitCloneError extends GitDomainError {
  constructor(url: string, message: string) {
    super('GIT_CLONE_ERROR', `Failed to clone ${url}: ${message}`, true);
  }
}

export class GitWorktreeError extends GitDomainError {
  constructor(message: string) {
    super('GIT_WORKTREE_ERROR', message, true);
  }
}

export class GitCommitError extends GitDomainError {
  constructor(message: string) {
    super('GIT_COMMIT_ERROR', message, true);
  }
}

export class GitResetError extends GitDomainError {
  constructor(message: string) {
    super('GIT_RESET_ERROR', message, true);
  }
}

export class GitBranchNotFoundError extends GitDomainError {
  constructor(branch: string) {
    super('GIT_BRANCH_NOT_FOUND', `Branch not found: ${branch}`);
  }
}

export class GitAuthenticationError extends GitDomainError {
  constructor(message: string) {
    super('GIT_AUTH_ERROR', `Authentication failed: ${message}`);
  }
}

export class GitBranchCreateError extends GitDomainError {
  constructor(branch: string, message: string) {
    super('GIT_BRANCH_CREATE_ERROR', `Failed to create branch ${branch}: ${message}`, true);
  }
}

export class GitBranchDeleteError extends GitDomainError {
  constructor(branch: string, message: string) {
    super('GIT_BRANCH_DELETE_ERROR', `Failed to delete branch ${branch}: ${message}`, true);
  }
}

export class GitDeleteRepoError extends GitDomainError {
  constructor(path: string, message: string) {
    super('GIT_DELETE_REPO_ERROR', `Failed to delete repo at ${path}: ${message}`, true);
  }
}
