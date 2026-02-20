import type { GitId, WorkflowId } from '@common/ids/index.js';

export abstract class GitWorkflowRefStore {
  abstract addReference(gitId: GitId, workflowId: WorkflowId): Promise<void>;
  abstract removeReference(gitId: GitId, workflowId: WorkflowId): Promise<void>;
  abstract removeAllByWorkflowId(workflowId: WorkflowId): Promise<void>;
  abstract findWorkflowIdsByGitId(gitId: GitId): Promise<WorkflowId[]>;
}
