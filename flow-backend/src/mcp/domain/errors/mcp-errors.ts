import { DomainError } from '@common/errors/index.js';

export class McpDomainError extends DomainError {
  constructor(code: string, message: string, isTransient: boolean = false) {
    super(code, message, isTransient);
  }
}

export class McpInvariantViolationError extends McpDomainError {
  constructor(message: string) {
    super('MCP_INVARIANT_VIOLATION', message);
  }
}

export class McpEntityNotFoundError extends McpDomainError {
  constructor(id: string) {
    super('MCP_NOT_FOUND', `MCP server not found: ${id}`);
  }
}

export class McpValidationError extends McpDomainError {
  constructor(message: string) {
    super('MCP_VALIDATION_ERROR', message);
  }
}
