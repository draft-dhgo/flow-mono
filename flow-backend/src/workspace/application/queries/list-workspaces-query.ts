import { Injectable } from '@nestjs/common';
import { WorkspaceRepository } from '../../domain/ports/workspace-repository.js';

export interface WorkspaceListItem {
  id: string;
  name: string;
  status: string;
  model: string;
  purpose: string;
  gitRefCount: number;
  createdAt: string;
}

@Injectable()
export class ListWorkspacesQuery {
  constructor(private readonly workspaceRepository: WorkspaceRepository) {}

  async execute(): Promise<WorkspaceListItem[]> {
    const workspaces = await this.workspaceRepository.findAll();
    return workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      status: ws.status,
      model: ws.model,
      purpose: ws.purpose,
      gitRefCount: ws.gitRefs.length,
      createdAt: ws.createdAt.toISOString(),
    }));
  }
}
