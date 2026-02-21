import { Injectable, Inject } from '@nestjs/common';
import { WorkspaceId } from '@common/ids/index.js';
import { GitReader } from '@common/ports/index.js';
import { WorkspaceRepository } from '../../domain/ports/workspace-repository.js';
import { WorkspaceEntityNotFoundError } from '../../domain/errors/index.js';

export interface WorkspaceGitRefResponse {
  gitId: string;
  gitUrl: string;
  baseBranch: string;
  branchName: string;
}

export interface WorkspaceDetailResponse {
  id: string;
  name: string;
  status: string;
  model: string;
  path: string;
  purpose: string;
  agentSessionId: string | null;
  createdAt: string;
  gitRefs: WorkspaceGitRefResponse[];
  mcpServerRefs: { mcpServerId: string; envOverrides: Record<string, string> }[];
}

@Injectable()
export class GetWorkspaceQuery {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    @Inject(GitReader) private readonly gitReader: GitReader,
  ) {}

  async execute(id: string): Promise<WorkspaceDetailResponse> {
    const workspaceId = WorkspaceId.create(id);
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new WorkspaceEntityNotFoundError('Workspace', id);
    }

    const gitInfos = await this.gitReader.findByIds(workspace.gitRefs.map((r) => r.gitId));

    return {
      id: workspace.id,
      name: workspace.name,
      status: workspace.status,
      model: workspace.model,
      path: workspace.path,
      purpose: workspace.purpose,
      agentSessionId: workspace.agentSessionId,
      createdAt: workspace.createdAt.toISOString(),
      gitRefs: workspace.gitRefs.map((ref) => ({
        gitId: ref.gitId as string,
        gitUrl: gitInfos.find((g) => g.id === ref.gitId)?.url ?? '',
        baseBranch: ref.baseBranch,
        branchName: ref.branchName,
      })),
      mcpServerRefs: [...workspace.mcpServerRefs],
    };
  }
}
