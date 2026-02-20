import { DomainError } from '@common/errors/index.js';

export class AgentDomainError extends DomainError {
  constructor(code: string, message: string, isTransient: boolean = false) {
    super(code, message, isTransient);
  }
}

export class AgentStartError extends AgentDomainError {
  constructor(message: string) {
    super('AGENT_START_ERROR', message, true);
  }
}

export class AgentQueryError extends AgentDomainError {
  constructor(message: string) {
    super('AGENT_QUERY_ERROR', message, true);
  }
}

export class AgentTimeoutError extends AgentDomainError {
  constructor(message: string) {
    super('AGENT_TIMEOUT', message, true);
  }
}

export class AgentProcessCrashError extends AgentDomainError {
  constructor(message: string) {
    super('AGENT_PROCESS_CRASH', message, true);
  }
}
