import type { WorkflowSpace } from '../domain/entities/workflow-space.js';
import type { WorkflowSpaceId, WorkflowRunId } from '../domain/value-objects/index.js';
import { WorkflowSpaceRepository } from '../domain/ports/workflow-space-repository.js';
import type { InMemorySnapshotRegistry } from '@common/infra/in-memory-unit-of-work.js';

export class InMemoryWorkflowSpaceRepository extends WorkflowSpaceRepository implements InMemorySnapshotRegistry {
  private readonly store = new Map<WorkflowSpaceId, WorkflowSpace>();

  snapshot(): Map<unknown, unknown> {
    return new Map(this.store);
  }

  restore(snap: Map<unknown, unknown>): void {
    this.store.clear();
    for (const [k, v] of snap) {
      this.store.set(k as WorkflowSpaceId, v as WorkflowSpace);
    }
  }

  async findById(id: WorkflowSpaceId): Promise<WorkflowSpace | null> {
    return this.store.get(id) ?? null;
  }

  async findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<WorkflowSpace | null> {
    return [...this.store.values()].find((ws) => ws.workflowRunId === workflowRunId) ?? null;
  }

  async save(workflowSpace: WorkflowSpace): Promise<void> {
    this.store.set(workflowSpace.id, workflowSpace);
  }

  async delete(id: WorkflowSpaceId): Promise<void> {
    this.store.delete(id);
  }

  async deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void> {
    for (const [id, ws] of this.store) {
      if (ws.workflowRunId === workflowRunId) this.store.delete(id);
    }
  }

  async exists(id: WorkflowSpaceId): Promise<boolean> {
    return this.store.has(id);
  }
}
