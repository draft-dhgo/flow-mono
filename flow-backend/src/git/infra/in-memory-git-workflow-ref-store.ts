import type { GitId, WorkflowId } from '@common/ids/index.js';
import { GitWorkflowRefStore } from '../domain/ports/git-workflow-ref-store.js';

export class InMemoryGitWorkflowRefStore extends GitWorkflowRefStore {
  /** gitId -> Set<workflowId> */
  private readonly gitToWorkflows = new Map<string, Set<string>>();
  /** workflowId -> Set<gitId> (reverse index for removeAllByWorkflowId) */
  private readonly workflowToGits = new Map<string, Set<string>>();

  async addReference(gitId: GitId, workflowId: WorkflowId): Promise<void> {
    if (!this.gitToWorkflows.has(gitId)) {
      this.gitToWorkflows.set(gitId, new Set());
    }
    this.gitToWorkflows.get(gitId)!.add(workflowId);

    if (!this.workflowToGits.has(workflowId)) {
      this.workflowToGits.set(workflowId, new Set());
    }
    this.workflowToGits.get(workflowId)!.add(gitId);
  }

  async removeReference(gitId: GitId, workflowId: WorkflowId): Promise<void> {
    const workflowIds = this.gitToWorkflows.get(gitId);
    if (workflowIds) {
      workflowIds.delete(workflowId);
      if (workflowIds.size === 0) {
        this.gitToWorkflows.delete(gitId);
      }
    }

    const gitIds = this.workflowToGits.get(workflowId);
    if (gitIds) {
      gitIds.delete(gitId);
      if (gitIds.size === 0) {
        this.workflowToGits.delete(workflowId);
      }
    }
  }

  async removeAllByWorkflowId(workflowId: WorkflowId): Promise<void> {
    const gitIds = this.workflowToGits.get(workflowId);
    if (gitIds) {
      for (const gitId of gitIds) {
        const workflowIds = this.gitToWorkflows.get(gitId);
        if (workflowIds) {
          workflowIds.delete(workflowId);
          if (workflowIds.size === 0) {
            this.gitToWorkflows.delete(gitId);
          }
        }
      }
      this.workflowToGits.delete(workflowId);
    }
  }

  async findWorkflowIdsByGitId(gitId: GitId): Promise<WorkflowId[]> {
    const workflowIds = this.gitToWorkflows.get(gitId);
    if (!workflowIds) {
      return [];
    }
    return [...workflowIds] as WorkflowId[];
  }
}
