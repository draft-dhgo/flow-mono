import { RuntimeDomainError } from './runtime-errors.js';

export class DirectoryCreateError extends RuntimeDomainError {
  constructor(path: string, message: string) {
    super('DIR_CREATE_ERROR', `Failed to create directory ${path}: ${message}`, true);
  }
}

export class SymlinkCreateError extends RuntimeDomainError {
  constructor(linkPath: string, message: string) {
    super('SYMLINK_CREATE_ERROR', `Failed to create symlink ${linkPath}: ${message}`, true);
  }
}

export class DirectoryDeleteError extends RuntimeDomainError {
  constructor(path: string, message: string) {
    super('DIR_DELETE_ERROR', `Failed to delete directory ${path}: ${message}`, true);
  }
}

export class FileDeleteError extends RuntimeDomainError {
  constructor(path: string, message: string) {
    super('FILE_DELETE_ERROR', `Failed to delete file ${path}: ${message}`, true);
  }
}

export class SymlinkDeleteError extends RuntimeDomainError {
  constructor(linkPath: string, message: string) {
    super('SYMLINK_DELETE_ERROR', `Failed to delete symlink ${linkPath}: ${message}`, true);
  }
}

export class PermissionDeniedError extends RuntimeDomainError {
  constructor(path: string) {
    super('PERMISSION_DENIED', `Permission denied: ${path}`);
  }
}
