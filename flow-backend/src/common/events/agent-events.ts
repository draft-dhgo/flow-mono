import { BaseDomainEvent } from './domain-event.js';
import type { WorkExecutionId, WorkflowRunId } from '../ids/index.js';

interface AgentSessionStartedPayload {
  agentSessionId: string;
  workExecutionId: WorkExecutionId;
  workflowRunId: WorkflowRunId;
  processId: string;
}

export class AgentSessionStarted extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'agent.session_started';
  readonly payload: Readonly<AgentSessionStartedPayload>;

  constructor(payload: AgentSessionStartedPayload, correlationId?: string) {
    super(AgentSessionStarted.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface AgentSessionStoppedPayload {
  agentSessionId: string;
  workExecutionId: WorkExecutionId;
  workflowRunId: WorkflowRunId;
}

export class AgentSessionStopped extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'agent.session_stopped';
  readonly payload: Readonly<AgentSessionStoppedPayload>;

  constructor(payload: AgentSessionStoppedPayload, correlationId?: string) {
    super(AgentSessionStopped.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}
