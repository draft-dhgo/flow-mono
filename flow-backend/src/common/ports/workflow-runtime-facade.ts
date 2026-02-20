export interface StartWorkflowRunParams {
  readonly workflowId: string;
  readonly issueKey: string;
}

export interface StartWorkflowRunResult {
  readonly workflowRunId: string;
  readonly status: string;
}

export interface ResumeWorkflowRunParams {
  readonly workflowRunId: string;
  readonly checkpointId?: string;
}

export interface CancelWorkflowRunParams {
  readonly workflowRunId: string;
  readonly reason?: string;
}

/**
 * Facade for workflow runtime operations — used by mcp-gateway to avoid cross-domain imports.
 */
export abstract class WorkflowRuntimeFacade {
  abstract listRuns(): Promise<ReadonlyArray<Record<string, unknown>>>;
  abstract getRunSummary(): Promise<Record<string, unknown>>;
  abstract getRunById(workflowRunId: string): Promise<Record<string, unknown> | null>;
  abstract startRun(params: StartWorkflowRunParams): Promise<StartWorkflowRunResult>;
  abstract pauseRun(workflowRunId: string): Promise<void>;
  abstract resumeRun(params: ResumeWorkflowRunParams): Promise<void>;
  abstract cancelRun(params: CancelWorkflowRunParams): Promise<void>;
  abstract deleteRun(workflowRunId: string): Promise<void>;
}
