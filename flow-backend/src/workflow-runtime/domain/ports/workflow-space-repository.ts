import type { WorkflowSpace } from '../entities/workflow-space.js';
import type { WorkflowSpaceId, WorkflowRunId } from '../value-objects/index.js';

export abstract class WorkflowSpaceRepository {
  abstract findById(id: WorkflowSpaceId): Promise<WorkflowSpace | null>;
  abstract findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<WorkflowSpace | null>;
  abstract save(workflowSpace: WorkflowSpace): Promise<void>;
  abstract delete(id: WorkflowSpaceId): Promise<void>;
  abstract deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void>;
  abstract exists(id: WorkflowSpaceId): Promise<boolean>;
}
