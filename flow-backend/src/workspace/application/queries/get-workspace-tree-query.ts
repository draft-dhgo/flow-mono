import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { WorkspaceId } from '@common/ids/index.js';
import { FileSystem } from '@common/ports/file-system.js';
import { WorkspaceRepository } from '../../domain/ports/workspace-repository.js';
import { WorkspaceEntityNotFoundError } from '../../domain/errors/index.js';

export interface FileTreeEntry {
  readonly path: string;
  readonly isDirectory: boolean;
  readonly size: number;
}

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.claude', '__pycache__', '.next', 'dist', 'build',
]);

@Injectable()
export class AdhocGetWorkspaceTreeQuery {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly fileSystem: FileSystem,
  ) {}

  async execute(workspaceId: string): Promise<FileTreeEntry[]> {
    const id = WorkspaceId.create(workspaceId);
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) {
      throw new WorkspaceEntityNotFoundError('Workspace', workspaceId);
    }

    const entries: FileTreeEntry[] = [];

    const walkDirectory = async (dirPath: string, relativePath: string): Promise<void> => {
      const items = await this.fileSystem.list(dirPath);
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relPath = relativePath === '' ? item : path.join(relativePath, item);
        try {
          const statResult = await this.fileSystem.stat(fullPath);
          entries.push({ path: relPath, isDirectory: statResult.isDirectory, size: statResult.size });
          if (statResult.isDirectory && !EXCLUDED_DIRS.has(item)) {
            await walkDirectory(fullPath, relPath);
          }
        } catch {
          // skip unreadable items
        }
      }
    };

    await walkDirectory(workspace.path, '');
    entries.sort((a, b) => a.path.localeCompare(b.path));
    return entries;
  }
}
