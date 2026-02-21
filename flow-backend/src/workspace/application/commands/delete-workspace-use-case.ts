import { Injectable, Inject } from '@nestjs/common';
import { WorkspaceId } from '@common/ids/index.js';
import { AgentService, GitService, GitReader } from '@common/ports/index.js';
import { FileSystem } from '@common/ports/file-system.js';
import { WorkspaceRepository } from '../../domain/ports/workspace-repository.js';
import { WorkspaceEntityNotFoundError } from '../../domain/errors/index.js';
import { WorkspacePurpose } from '../../domain/value-objects/workspace-purpose.js';
import { AdhocWorkspacePathFactory } from '../factories/workspace-path-factory.js';

@Injectable()
export class DeleteWorkspaceUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    @Inject(AgentService) private readonly agentService: AgentService,
    @Inject(GitService) private readonly gitService: GitService,
    @Inject(GitReader) private readonly gitReader: GitReader,
    private readonly fileSystem: FileSystem,
    private readonly pathFactory: AdhocWorkspacePathFactory,
  ) {}

  async execute(id: string): Promise<void> {
    const workspaceId = WorkspaceId.create(id);
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new WorkspaceEntityNotFoundError('Workspace', id);
    }

    // Stop agent session
    if (workspace.agentSessionId) {
      try {
        await this.agentService.stopSessionForWorkspace(workspace.id);
      } catch {
        // ignore
      }
    }

    if (workspace.purpose === WorkspacePurpose.WORKFLOW_BUILDER) {
      // WORKFLOW_BUILDER: only remove detached worktrees we created (not shared ones)
      // The workspace dir contains symlinks — just delete the directory
      // Detached worktrees created by this workspace are at pathFactory.workTreePath
      const gitInfos = await this.gitReader.findByIds(workspace.gitRefs.map((r) => r.gitId));
      for (const gitRef of workspace.gitRefs) {
        const gitInfo = gitInfos.find((g) => g.id === gitRef.gitId);
        if (!gitInfo) continue;
        const worktreePath = this.pathFactory.workTreePath(workspaceId, gitRef.gitId);
        try {
          await this.gitService.deleteWorktree(gitInfo.localPath, worktreePath);
        } catch {
          // May not exist if we used a shared worktree
        }
      }
    } else {
      // GENERAL: remove worktrees + branches
      const gitInfos = await this.gitReader.findByIds(workspace.gitRefs.map((r) => r.gitId));
      for (const gitRef of workspace.gitRefs) {
        const gitInfo = gitInfos.find((g) => g.id === gitRef.gitId);
        if (gitInfo) {
          try {
            await this.gitService.removeWorktreeForBranch(gitInfo.localPath, gitRef.branchName);
            await this.gitService.deleteBranch(gitInfo.localPath, gitRef.branchName);
          } catch {
            // ignore
          }
        }
      }
    }

    // Delete workspace directory
    try {
      await this.fileSystem.deleteDirectory(workspace.path);
    } catch {
      // ignore
    }

    await this.workspaceRepository.delete(workspaceId);
  }
}
