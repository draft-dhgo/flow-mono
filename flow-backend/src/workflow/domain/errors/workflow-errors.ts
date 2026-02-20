import { DomainError } from '@common/errors/index.js';

export class WorkflowDomainError extends DomainError {
  constructor(code: string, message: string) {
    super(code, message);
  }
}

export class WorkflowInvariantViolationError extends WorkflowDomainError {
  constructor(message: string) {
    super('WORKFLOW_INVARIANT_VIOLATION', message);
  }
}

export class WorkflowEntityNotFoundError extends WorkflowDomainError {
  constructor(id: string) {
    super('WORKFLOW_NOT_FOUND', `Workflow not found: ${id}`);
  }
}
