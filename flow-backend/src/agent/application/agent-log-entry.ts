import { v4 as uuidv4 } from 'uuid';

export type AgentLogEntryType =
  | 'system_init'
  | 'assistant_text'
  | 'tool_use'
  | 'tool_result'
  | 'result_summary'
  | 'error';

export interface AgentLogEntryContent {
  text?: string;
  toolName?: string;
  toolInput?: string;
  durationMs?: number;
  totalCostUsd?: number;
  numTurns?: number;
  usage?: { inputTokens: number; outputTokens: number };
  errorMessage?: string;
}

export interface AgentLogEntry {
  id: string;
  workExecutionId: string | null;
  entryType: AgentLogEntryType;
  content: AgentLogEntryContent;
  createdAt: Date;
}

export function createAgentLogEntry(
  entryType: AgentLogEntryType,
  content: AgentLogEntryContent,
  workExecutionId?: string,
): AgentLogEntry {
  return {
    id: uuidv4(),
    workExecutionId: workExecutionId ?? null,
    entryType,
    content,
    createdAt: new Date(),
  };
}
