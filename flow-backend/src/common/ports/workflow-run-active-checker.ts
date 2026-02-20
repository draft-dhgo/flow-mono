import type { WorkflowId } from '../ids/index.js';

export abstract class WorkflowRunActiveChecker {
  abstract hasActiveRuns(workflowId: WorkflowId): Promise<boolean>;
}
