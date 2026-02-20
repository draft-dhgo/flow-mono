import { RuntimeDomainError } from './runtime-errors.js';

export class CheckpointInvalidError extends RuntimeDomainError {
  constructor(message: string) {
    super('CHECKPOINT_INVALID', message);
  }
}

export class CheckpointCreateError extends RuntimeDomainError {
  constructor(message: string) {
    super('CHECKPOINT_CREATE_ERROR', message, true);
  }
}

export class CheckpointRollbackError extends RuntimeDomainError {
  constructor(message: string) {
    super('CHECKPOINT_ROLLBACK_ERROR', message, true);
  }
}

export class CheckpointNotFoundError extends RuntimeDomainError {
  constructor(id: string) {
    super('CHECKPOINT_NOT_FOUND', `Checkpoint not found: ${id}`);
  }
}
