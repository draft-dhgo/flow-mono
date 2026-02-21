import { Injectable } from '@nestjs/common';
import type { WorkspaceId, GitId } from '@common/ids/index.js';
import { tempBasePath, buildPath } from '@common/utils/index.js';

@Injectable()
export class AdhocWorkspacePathFactory {
  private readonly basePath = tempBasePath('FLOWFLOW_DATA_PATH', 'flowflow-data');

  workspacePath(workspaceId: WorkspaceId): string {
    return buildPath(this.basePath, 'workspaces', 'adhoc', workspaceId);
  }

  workTreePath(workspaceId: WorkspaceId, gitId: GitId): string {
    return buildPath(this.basePath, 'worktrees', 'adhoc', workspaceId, gitId);
  }
}
