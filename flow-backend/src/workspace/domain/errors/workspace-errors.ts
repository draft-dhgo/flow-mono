import { DomainError } from '@common/errors/index.js';

export class WorkspaceDomainError extends DomainError {
  constructor(code: string, message: string, isTransient: boolean = false) {
    super(code, message, isTransient);
  }
}

export class WorkspaceInvariantViolationError extends WorkspaceDomainError {
  constructor(entity: string, message: string) {
    super('WORKSPACE_INVARIANT_VIOLATION', `[${entity}] ${message}`);
  }
}

export class WorkspaceInvalidStateTransitionError extends WorkspaceDomainError {
  constructor(entity: string, from: string, to: string) {
    super('WORKSPACE_INVALID_STATE_TRANSITION', `[${entity}] Invalid transition: ${from} → ${to}`);
  }
}

export class WorkspaceEntityNotFoundError extends WorkspaceDomainError {
  constructor(entity: string, id: string) {
    super('WORKSPACE_ENTITY_NOT_FOUND', `${entity} not found: ${id}`);
  }
}
