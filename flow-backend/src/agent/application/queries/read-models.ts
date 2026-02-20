import type { AgentSessionId } from '../../domain/value-objects/index.js';
import type { WorkExecutionId, WorkflowRunId } from '@common/ids/index.js';
import type { AgentLogEntryType, AgentLogEntryContent } from '../agent-log-entry.js';

export interface AgentSessionReadModel {
  readonly id: AgentSessionId;
  readonly workExecutionId: WorkExecutionId;
  readonly workflowRunId: WorkflowRunId;
  readonly model: string;
  readonly isAssigned: boolean;
}

export interface AgentLogReadModel {
  readonly id: string;
  readonly workExecutionId: string | null;
  readonly entryType: AgentLogEntryType;
  readonly content: AgentLogEntryContent;
  readonly createdAt: string;
}
