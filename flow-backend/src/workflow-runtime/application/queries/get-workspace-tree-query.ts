import path from 'node:path';
import { Injectable, Inject } from '@nestjs/common';
import { WorkflowSpaceRepository } from '../../domain/ports/workflow-space-repository.js';
import { FileSystem } from '../../domain/ports/file-system.js';
import { ApplicationError } from '@common/errors/index.js';
import type { WorkflowRunId } from '../../domain/value-objects/index.js';

export interface FileTreeEntry {
  readonly path: string;
  readonly isDirectory: boolean;
  readonly size: number;
}

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.claude', '__pycache__', '.next', 'dist', 'build',
]);

@Injectable()
export class GetWorkspaceTreeQuery {
  constructor(
    @Inject(WorkflowSpaceRepository) private readonly workflowSpaceRepository: WorkflowSpaceRepository,
    private readonly fileSystem: FileSystem,
  ) {}

  async execute(workflowRunId: WorkflowRunId): Promise<FileTreeEntry[]> {
    const workflowSpace = await this.workflowSpaceRepository.findByWorkflowRunId(workflowRunId);
    if (!workflowSpace) {
      throw new ApplicationError('WORKSPACE_NOT_FOUND', `Workspace not found for run ${workflowRunId}`);
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
          // skip unreadable items (e.g. broken symlinks)
        }
      }
    };

    await walkDirectory(workflowSpace.path, '');
    entries.sort((a, b) => a.path.localeCompare(b.path));
    return entries;
  }
}
