import type { WorkExecution } from '../entities/work-execution.js';
import type { WorkExecutionId, WorkflowRunId } from '../value-objects/index.js';

export abstract class WorkExecutionRepository {
  abstract findById(id: WorkExecutionId): Promise<WorkExecution | null>;
  abstract findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<WorkExecution[]>;
  abstract findByWorkflowRunIdOrderedBySequence(workflowRunId: WorkflowRunId): Promise<WorkExecution[]>;
  abstract save(workExecution: WorkExecution): Promise<void>;
  abstract saveAll(workExecutions: WorkExecution[]): Promise<void>;
  abstract delete(id: WorkExecutionId): Promise<void>;
  abstract deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void>;
  abstract exists(id: WorkExecutionId): Promise<boolean>;
}
