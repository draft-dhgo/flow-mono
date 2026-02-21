import type { WorkflowRun } from '../domain/entities/workflow-run.js';
import type { WorkflowRunId } from '../domain/value-objects/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import { WorkflowRunRepository } from '../domain/ports/workflow-run-repository.js';
import type { InMemorySnapshotRegistry } from '@common/infra/in-memory-unit-of-work.js';

export class InMemoryWorkflowRunRepository extends WorkflowRunRepository implements InMemorySnapshotRegistry {
  private readonly store = new Map<WorkflowRunId, WorkflowRun>();

  snapshot(): Map<unknown, unknown> {
    return new Map(this.store);
  }

  restore(snap: Map<unknown, unknown>): void {
    this.store.clear();
    for (const [k, v] of snap) {
      this.store.set(k as WorkflowRunId, v as WorkflowRun);
    }
  }

  async findById(id: WorkflowRunId): Promise<WorkflowRun | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<WorkflowRun[]> {
    return [...this.store.values()];
  }

  async findByWorkflowId(workflowId: WorkflowId): Promise<WorkflowRun[]> {
    return [...this.store.values()].filter((r) => r.workflowId === workflowId);
  }

  async save(workflowRun: WorkflowRun): Promise<void> {
    this.store.set(workflowRun.id, workflowRun);
  }

  async delete(id: WorkflowRunId): Promise<void> {
    this.store.delete(id);
  }

  async exists(id: WorkflowRunId): Promise<boolean> {
    return this.store.has(id);
  }
}
