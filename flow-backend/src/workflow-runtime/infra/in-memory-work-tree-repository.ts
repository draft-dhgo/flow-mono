import type { WorkTree } from '../domain/entities/work-tree.js';
import type { WorkTreeId, WorkflowRunId } from '../domain/value-objects/index.js';
import { WorkTreeRepository } from '../domain/ports/work-tree-repository.js';

export class InMemoryWorkTreeRepository extends WorkTreeRepository {
  private readonly store = new Map<WorkTreeId, WorkTree>();

  async findById(id: WorkTreeId): Promise<WorkTree | null> {
    return this.store.get(id) ?? null;
  }

  async findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<WorkTree[]> {
    return [...this.store.values()].filter((wt) => wt.workflowRunId === workflowRunId);
  }

  async save(workTree: WorkTree): Promise<void> {
    this.store.set(workTree.id, workTree);
  }

  async delete(id: WorkTreeId): Promise<void> {
    this.store.delete(id);
  }

  async deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void> {
    for (const [id, wt] of this.store) {
      if (wt.workflowRunId === workflowRunId) this.store.delete(id);
    }
  }

  async exists(id: WorkTreeId): Promise<boolean> {
    return this.store.has(id);
  }

  async findByGitId(gitId: string): Promise<WorkTree[]> {
    return [...this.store.values()].filter((wt) => String(wt.gitId) === gitId);
  }
}
