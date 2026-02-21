import { Injectable } from '@nestjs/common';
import type { Workspace } from '../domain/entities/workspace.js';
import type { WorkspaceId } from '@common/ids/index.js';
import { WorkspaceRepository } from '../domain/ports/workspace-repository.js';

@Injectable()
export class InMemoryWorkspaceRepository extends WorkspaceRepository {
  private readonly store = new Map<WorkspaceId, Workspace>();

  async findById(id: WorkspaceId): Promise<Workspace | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Workspace[]> {
    return [...this.store.values()];
  }

  async save(workspace: Workspace): Promise<void> {
    this.store.set(workspace.id, workspace);
  }

  async delete(id: WorkspaceId): Promise<void> {
    this.store.delete(id);
  }
}
