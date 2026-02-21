import type { Checkpoint } from '../domain/entities/checkpoint.js';
import type { CheckpointId, WorkflowRunId } from '../domain/value-objects/index.js';
import { CheckpointRepository } from '../domain/ports/checkpoint-repository.js';
import type { InMemorySnapshotRegistry } from '@common/infra/in-memory-unit-of-work.js';

export class InMemoryCheckpointRepository extends CheckpointRepository implements InMemorySnapshotRegistry {
  private readonly store = new Map<CheckpointId, Checkpoint>();

  snapshot(): Map<unknown, unknown> {
    return new Map(this.store);
  }

  restore(snap: Map<unknown, unknown>): void {
    this.store.clear();
    for (const [k, v] of snap) {
      this.store.set(k as CheckpointId, v as Checkpoint);
    }
  }

  async findById(id: CheckpointId): Promise<Checkpoint | null> {
    return this.store.get(id) ?? null;
  }

  async findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<Checkpoint[]> {
    return [...this.store.values()].filter((c) => c.workflowRunId === workflowRunId);
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    this.store.set(checkpoint.id, checkpoint);
  }

  async delete(id: CheckpointId): Promise<void> {
    this.store.delete(id);
  }

  async deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void> {
    for (const [id, c] of this.store) {
      if (c.workflowRunId === workflowRunId) this.store.delete(id);
    }
  }

  async exists(id: CheckpointId): Promise<boolean> {
    return this.store.has(id);
  }
}
