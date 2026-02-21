import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../ports/unit-of-work.js';

export interface InMemorySnapshotRegistry {
  snapshot(): Map<unknown, unknown>;
  restore(snapshot: Map<unknown, unknown>): void;
}

@Injectable()
export class InMemoryUnitOfWork extends UnitOfWork {
  private readonly snapshotTargets: InMemorySnapshotRegistry[] = [];

  registerTarget(target: InMemorySnapshotRegistry): void {
    this.snapshotTargets.push(target);
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    const snapshots = this.snapshotTargets.map((target) => target.snapshot());
    try {
      return await work();
    } catch (err: unknown) {
      for (let i = 0; i < this.snapshotTargets.length; i++) {
        this.snapshotTargets[i].restore(snapshots[i]);
      }
      throw err;
    }
  }
}
