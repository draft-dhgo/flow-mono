import { Injectable, Inject } from '@nestjs/common';
import { WorkspaceRepository } from '../../domain/ports/workspace-repository.js';
import { WorkspaceStatus } from '../../domain/value-objects/workspace-status.js';
import { GitService, GitReader } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/application-error.js';
import { AdhocWorkspacePathFactory } from '../factories/workspace-path-factory.js';
import type { WorkspaceId } from '@common/ids/index.js';

export interface PushResult {
  readonly gitId: string;
  readonly branch: string;
  readonly success: boolean;
  readonly error: string | null;
}

export interface PushBranchesResult {
  readonly results: PushResult[];
}

@Injectable()
export class PushWorkspaceBranchesUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    @Inject(GitService) private readonly gitService: GitService,
    @Inject(GitReader) private readonly gitReader: GitReader,
    private readonly pathFactory: AdhocWorkspacePathFactory,
  ) {}

  async execute(workspaceId: WorkspaceId): Promise<PushBranchesResult> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new ApplicationError('WORKSPACE_NOT_FOUND', `Workspace not found: ${workspaceId}`);
    }

    if (workspace.status !== WorkspaceStatus.COMPLETED) {
      throw new ApplicationError('INVALID_STATE', '완료된 워크스페이스만 푸시할 수 있습니다.');
    }

    const gitInfos = await this.gitReader.findByIds(workspace.gitRefs.map((r) => r.gitId));

    const results: PushResult[] = [];
    for (const gitRef of workspace.gitRefs) {
      const gitInfo = gitInfos.find((g) => String(g.id) === String(gitRef.gitId));
      if (!gitInfo) {
        results.push({ gitId: String(gitRef.gitId), branch: gitRef.branchName, success: false, error: 'Git 레포 정보를 찾을 수 없습니다.' });
        continue;
      }

      const workTreePath = this.pathFactory.workTreePath(workspaceId, gitRef.gitId);

      try {
        await this.gitService.push(workTreePath, gitRef.branchName);
        results.push({ gitId: String(gitRef.gitId), branch: gitRef.branchName, success: true, error: null });
      } catch (err: unknown) {
        results.push({
          gitId: String(gitRef.gitId),
          branch: gitRef.branchName,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { results };
  }
}
