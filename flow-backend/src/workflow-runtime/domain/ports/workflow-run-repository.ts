import type { WorkflowRun } from '../entities/workflow-run.js';
import type { WorkflowRunId } from '../value-objects/index.js';
import type { WorkflowId } from '@common/ids/index.js';

export abstract class WorkflowRunRepository {
  abstract findById(id: WorkflowRunId): Promise<WorkflowRun | null>;
  abstract findAll(): Promise<WorkflowRun[]>;
  abstract findByWorkflowId(workflowId: WorkflowId): Promise<WorkflowRun[]>;
  abstract save(workflowRun: WorkflowRun): Promise<void>;
  abstract delete(id: WorkflowRunId): Promise<void>;
  abstract exists(id: WorkflowRunId): Promise<boolean>;
}
