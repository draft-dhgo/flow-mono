import { ApplicationError } from '@common/errors/index.js';

export class AgentSessionNotFoundError extends ApplicationError {
  constructor(workExecutionId: string) {
    super('AGENT_SESSION_NOT_FOUND', `Agent session not found for workExecutionId: ${workExecutionId}`);
  }
}

export class AgentSessionCreationError extends ApplicationError {
  constructor(message: string) {
    super('AGENT_SESSION_CREATION_ERROR', `Failed to create agent session: ${message}`);
  }
}
