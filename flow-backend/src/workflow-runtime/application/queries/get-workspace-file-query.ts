import path from 'node:path';
import { Injectable, Inject } from '@nestjs/common';
import { WorkflowSpaceRepository } from '../../domain/ports/workflow-space-repository.js';
import { FileSystem } from '../../domain/ports/file-system.js';
import { ApplicationError } from '@common/errors/index.js';
import type { WorkflowRunId } from '../../domain/value-objects/index.js';

export interface WorkspaceFileContent {
  readonly content: string;
  readonly path: string;
}

@Injectable()
export class GetWorkspaceFileQuery {
  constructor(
    @Inject(WorkflowSpaceRepository) private readonly workflowSpaceRepository: WorkflowSpaceRepository,
    private readonly fileSystem: FileSystem,
  ) {}

  async execute(workflowRunId: WorkflowRunId, filePath: string): Promise<WorkspaceFileContent> {
    const workflowSpace = await this.workflowSpaceRepository.findByWorkflowRunId(workflowRunId);
    if (!workflowSpace) {
      throw new ApplicationError('WORKSPACE_NOT_FOUND', `Workspace not found for run ${workflowRunId}`);
    }

    const resolvedPath = path.resolve(workflowSpace.path, filePath);
    const normalizedBase = path.resolve(workflowSpace.path);
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
