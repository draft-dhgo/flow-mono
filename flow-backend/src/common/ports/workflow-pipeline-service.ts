import type { WorkflowRunId } from '../ids/index.js';

export abstract class WorkflowPipelineService {
  abstract runPipeline(workflowRunId: WorkflowRunId): Promise<void>;
}
