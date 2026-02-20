import type { WorkflowId, GitId, McpServerId } from '../ids/index.js';

export interface TaskDefinitionConfig {
  readonly order: number;
  readonly query: string;
  readonly reportOutline?: {
    readonly sections: ReadonlyArray<{ readonly title: string; readonly description: string }>;
  };
}

export interface McpServerRefConfig {
  readonly mcpServerId: McpServerId;
  readonly envOverrides: Readonly<Record<string, string>>;
}

export interface GitRefConfig {
  readonly gitId: GitId;
  readonly baseBranch: string;
}

export interface WorkDefinitionConfig {
  readonly order: number;
  readonly model: string;
  readonly pauseAfter: boolean;
  readonly reportFileRefs: readonly number[];
  readonly taskDefinitions: ReadonlyArray<TaskDefinitionConfig>;
  readonly mcpServerRefs: ReadonlyArray<McpServerRefConfig>;
  readonly gitRefs: ReadonlyArray<GitRefConfig>;
}

export interface WorkflowConfig {
  readonly id: WorkflowId;
  readonly name: string;
  readonly status: string;
  readonly branchStrategy: string;
  readonly gitRefs: ReadonlyArray<GitRefConfig>;
  readonly mcpServerRefs: ReadonlyArray<McpServerRefConfig>;
  readonly seedKeys: ReadonlyArray<string>;
  readonly workDefinitions: ReadonlyArray<WorkDefinitionConfig>;
}

export abstract class WorkflowConfigReader {
  abstract findById(workflowId: WorkflowId): Promise<WorkflowConfig | null>;
}
