import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { WorkspaceId } from '@common/ids/index.js';
import { FileSystem } from '@common/ports/file-system.js';
import { ApplicationError } from '@common/errors/index.js';
import { WorkspaceRepository } from '../../domain/ports/workspace-repository.js';
import { WorkspaceEntityNotFoundError } from '../../domain/errors/index.js';

export interface WorkspaceFileContent {
  readonly content: string;
  readonly path: string;
}

@Injectable()
export class AdhocGetWorkspaceFileQuery {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly fileSystem: FileSystem,
  ) {}

  async execute(workspaceId: string, filePath: string): Promise<WorkspaceFileContent> {
    const id = WorkspaceId.create(workspaceId);
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) {
      throw new WorkspaceEntityNotFoundError('Workspace', workspaceId);
    }

    const resolvedPath = path.resolve(workspace.path, filePath);
    const normalizedBase = path.resolve(workspace.path);
    if (!resolvedPath.startsWith(normalizedBase)) {
      throw new ApplicationError('INVALID_FILE_PATH', '접근이 허용되지 않는 경로입니다');
    }

    const statResult = await this.fileSystem.stat(resolvedPath);
    if (statResult.isDirectory) {
      throw new ApplicationError('INVALID_FILE_PATH', '디렉토리는 읽을 수 없습니다');
    }
    if (statResult.size > 1_048_576) {
      throw new ApplicationError('FILE_TOO_LARGE', '파일 크기가 1MB를 초과합니다');
    }

    const content = await this.fileSystem.readFile(resolvedPath);
    return { path: filePath, content };
  }
}
