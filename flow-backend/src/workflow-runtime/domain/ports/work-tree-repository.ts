import type { WorkTree } from '../entities/work-tree.js';
import type { WorkTreeId, WorkflowRunId } from '../value-objects/index.js';

export abstract class WorkTreeRepository {
  abstract findById(id: WorkTreeId): Promise<WorkTree | null>;
  abstract findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<WorkTree[]>;
  abstract save(workTree: WorkTree): Promise<void>;
  abstract delete(id: WorkTreeId): Promise<void>;
  abstract deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void>;
  abstract exists(id: WorkTreeId): Promise<boolean>;
  abstract findByGitId(gitId: string): Promise<WorkTree[]>;
}
