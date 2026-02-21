import { Injectable, Inject } from '@nestjs/common';
import { WorkspaceId } from '@common/ids/index.js';
import { GitService } from '@common/ports/index.js';
import { FileSystem } from '@common/ports/file-system.js';
import { WorkspaceRepository } from '../../domain/ports/workspace-repository.js';
import { WorkspaceEntityNotFoundError } from '../../domain/errors/index.js';
import { AdhocWorkspacePathFactory } from '../factories/workspace-path-factory.js';

export interface DiffFileInfo {
  readonly path: string;
  readonly original: string;
  readonly modified: string;
}

@Injectable()
export class GetWorkspaceDiffQuery {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    @Inject(GitService) private readonly gitService: GitService,
    private readonly fileSystem: FileSystem,
    private readonly pathFactory: AdhocWorkspacePathFactory,
  ) {}

  async execute(workspaceId: string, gitId?: string): Promise<DiffFileInfo[]> {
    const id = WorkspaceId.create(workspaceId);
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) {
      throw new WorkspaceEntityNotFoundError('Workspace', workspaceId);
    }

    // Select target git ref
    const targetGitRef = gitId
      ? workspace.gitRefs.find((r) => String(r.gitId) === gitId)
      : workspace.gitRefs[0];
    if (!targetGitRef) {
      return [];
    }

    // Determine worktree path
    const workTreePath = this.pathFactory.workTreePath(id, targetGitRef.gitId);

    // Get changed files
    let changedFiles: string[];
    try {
      changedFiles = await this.gitService.diff(workTreePath, targetGitRef.baseBranch);
    } catch {
      return [];
    }

    // Get original/modified for each file
    const diffs: DiffFileInfo[] = [];
    for (const filePath of changedFiles) {
      let original = '';
      try {
        original = await this.gitService.getFileAtRef(workTreePath, targetGitRef.baseBranch, filePath);
      } catch {
        original = ''; // new file
      }

      let modified = '';
      try {
        const fullPath = `${workTreePath}/${filePath}`;
        modified = await this.fileSystem.readFile(fullPath);
      } catch {
        modified = ''; // deleted file
      }

      diffs.push({ path: filePath, original, modified });
    }

    return diffs;
  }
}
