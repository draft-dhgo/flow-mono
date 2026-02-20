export interface GitRefInput {
  readonly gitId: string;
  readonly baseBranch: string;
}

export interface McpServerRefInput {
  readonly mcpServerId: string;
  readonly envOverrides?: Record<string, string>;
}

export interface TaskDefinitionInput {
  readonly order: number;
  readonly query: string;
  readonly reportOutline?: {
    readonly sections: ReadonlyArray<{ readonly title: string; readonly description: string }>;
  };
}

export interface WorkDefinitionInput {
  readonly order: number;
  readonly model: string;
  readonly taskDefinitions: ReadonlyArray<TaskDefinitionInput>;
  readonly gitRefs?: ReadonlyArray<GitRefInput>;
  readonly mcpServerRefs?: ReadonlyArray<McpServerRefInput>;
  readonly pauseAfter?: boolean;
}

export interface CreateWorkflowParams {
  readonly name: string;
  readonly description?: string;
  readonly branchStrategy: string;
  readonly workDefinitions: ReadonlyArray<WorkDefinitionInput>;
  readonly gitRefs: ReadonlyArray<GitRefInput>;
  readonly mcpServerRefs?: ReadonlyArray<McpServerRefInput>;
}

export interface CreateWorkflowResult {
  readonly workflowId: string;
  readonly name: string;
}

export interface UpdateWorkflowParams {
  readonly workflowId: string;
  readonly name?: string;
  readonly description?: string;
  readonly workDefinitions?: ReadonlyArray<WorkDefinitionInput>;
  readonly gitRefs?: ReadonlyArray<GitRefInput>;
  readonly mcpServerRefs?: ReadonlyArray<McpServerRefInput>;
}

/**
 * Facade for workflow operations — used by mcp-gateway to avoid cross-domain imports.
 */
export abstract class WorkflowFacade {
  abstract list(): Promise<ReadonlyArray<Record<string, unknown>>>;
  abstract getById(workflowId: string): Promise<Record<string, unknown> | null>;
  abstract create(params: CreateWorkflowParams): Promise<CreateWorkflowResult>;
  abstract update(params: UpdateWorkflowParams): Promise<void>;
  abstract delete(workflowId: string): Promise<void>;
  abstract activate(workflowId: string): Promise<void>;
  abstract deactivate(workflowId: string): Promise<void>;
}
