import { DomainError } from '@common/errors/index.js';

export class RuntimeDomainError extends DomainError {
  constructor(code: string, message: string, isTransient: boolean = false) {
    super(code, message, isTransient);
  }
}

export class RuntimeInvariantViolationError extends RuntimeDomainError {
  constructor(entity: string, message: string) {
    super('RUNTIME_INVARIANT_VIOLATION', `[${entity}] ${message}`);
  }
}

export class RuntimeInvalidStateTransitionError extends RuntimeDomainError {
  constructor(entity: string, from: string, to: string) {
    super('RUNTIME_INVALID_STATE_TRANSITION', `[${entity}] Invalid transition: ${from} → ${to}`);
  }
}

export class RuntimeEntityNotFoundError extends RuntimeDomainError {
  constructor(entity: string, id: string) {
    super('RUNTIME_ENTITY_NOT_FOUND', `${entity} not found: ${id}`);
  }
}
