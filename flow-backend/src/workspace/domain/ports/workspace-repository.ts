import type { Workspace } from '../entities/workspace.js';
import type { WorkspaceId } from '@common/ids/index.js';

export abstract class WorkspaceRepository {
  abstract save(workspace: Workspace): Promise<void>;
  abstract findById(id: WorkspaceId): Promise<Workspace | null>;
  abstract findAll(): Promise<Workspace[]>;
  abstract delete(id: WorkspaceId): Promise<void>;
}
