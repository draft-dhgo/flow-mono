import type { Checkpoint } from '../entities/checkpoint.js';
import type { CheckpointId, WorkflowRunId } from '../value-objects/index.js';

export abstract class CheckpointRepository {
  abstract findById(id: CheckpointId): Promise<Checkpoint | null>;
  abstract findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<Checkpoint[]>;
  abstract save(checkpoint: Checkpoint): Promise<void>;
  abstract delete(id: CheckpointId): Promise<void>;
  abstract deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void>;
  abstract exists(id: CheckpointId): Promise<boolean>;
}
