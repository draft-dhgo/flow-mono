import { AggregateRoot } from '@common/aggregate-root.js';
import { AgentSessionId } from '../value-objects/index.js';
import type { McpServerConfig } from '../value-objects/index.js';
import type { WorkExecutionId, WorkflowRunId } from '@common/ids/index.js';
import { AgentDomainError } from '../errors/index.js';

export interface AgentSessionProps {
  id: AgentSessionId;
  workExecutionId: WorkExecutionId;
  workflowRunId: WorkflowRunId;
  model: string;
  workspacePath: string;
  mcpServerConfigs: McpServerConfig[];
  processId: string | null;
  sessionId: string | null;
  version?: number;
}

export interface CreateAgentSessionProps {
  workExecutionId: WorkExecutionId;
  workflowRunId: WorkflowRunId;
  model: string;
  workspacePath: string;
  mcpServerConfigs: McpServerConfig[];
}

export class AgentSession extends AggregateRoot<AgentSessionId> {
  private readonly _id: AgentSessionId;
  private readonly _workExecutionId: WorkExecutionId;
  private readonly _workflowRunId: WorkflowRunId;
  private readonly _model: string;
  private readonly _workspacePath: string;
  private readonly _mcpServerConfigs: readonly McpServerConfig[];
  private _processId: string | null;
  private _sessionId: string | null;

  private constructor(props: AgentSessionProps) {
    super();
    this._id = props.id;
    this._workExecutionId = props.workExecutionId;
    this._workflowRunId = props.workflowRunId;
    this._model = props.model;
    this._workspacePath = props.workspacePath;
    this._mcpServerConfigs = Object.freeze([...props.mcpServerConfigs]);
    this._processId = props.processId;
    this._sessionId = props.sessionId;
    if (props.version !== undefined) this.setVersion(props.version);
  }

  static create(props: CreateAgentSessionProps): AgentSession {
    if (!props.model.trim()) {
      throw new AgentDomainError('AGENT_INVARIANT_VIOLATION', 'Agent model cannot be empty');
    }
    if (!props.workspacePath.trim()) {
      throw new AgentDomainError('AGENT_INVARIANT_VIOLATION', 'Workspace path cannot be empty');
    }

    const id = AgentSessionId.generate();
    return new AgentSession({
      id,
      ...props,
      processId: null,
      sessionId: null,
    });
  }

  static fromProps(props: AgentSessionProps): AgentSession {
    return new AgentSession(props);
  }

  get id(): AgentSessionId { return this._id; }
  get workExecutionId(): WorkExecutionId { return this._workExecutionId; }
  get workflowRunId(): WorkflowRunId { return this._workflowRunId; }
  get model(): string { return this._model; }
  get workspacePath(): string { return this._workspacePath; }
  get mcpServerConfigs(): readonly McpServerConfig[] { return this._mcpServerConfigs; }
  get processId(): string | null { return this._processId; }
  get sessionId(): string | null { return this._sessionId; }
  get isAssigned(): boolean { return this._processId !== null && this._sessionId !== null; }

  assignProcess(processId: string): void {
    if (!processId.trim()) {
      throw new AgentDomainError('AGENT_INVARIANT_VIOLATION', 'Process ID cannot be empty');
    }
    this._processId = processId;
  }

  assignSession(handle: { sessionId: string; processId: string }): void {
    if (!handle.sessionId.trim()) {
      throw new AgentDomainError('AGENT_INVARIANT_VIOLATION', 'Session ID cannot be empty');
    }
    if (!handle.processId.trim()) {
      throw new AgentDomainError('AGENT_INVARIANT_VIOLATION', 'Process ID cannot be empty');
    }
    this._sessionId = handle.sessionId;
    this._processId = handle.processId;
  }
}
