import { DomainError } from './domain-error.js';

export class OptimisticLockError extends DomainError {
  constructor(entityName: string, entityId: string) {
    super(
      'OPTIMISTIC_LOCK_CONFLICT',
      `Concurrent modification detected for ${entityName}:${entityId}`,
      true,
    );
  }
}
