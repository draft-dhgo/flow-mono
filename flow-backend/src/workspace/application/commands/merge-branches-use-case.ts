import { Injectable, Inject } from '@nestjs/common';
import { WorkspaceRepository } from '../../domain/ports/workspace-repository.js';
import { AgentService, GitReader, WorkTreeRepository } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/application-error.js';
import { GitId, WorkflowRunId } from '@common/ids/index.js';
import type { WorkspaceId } from '@common/ids/index.js';

export interface MergeBranchesCommand {
  readonly workspaceId: WorkspaceId;
  readonly workflowRunIds: string[];
}

@Injectable()
export class MergeBranchesUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly workTreeRepository: WorkTreeRepository,
    @Inject(AgentService) private readonly agentService: AgentService,
    @Inject(GitReader) private readonly gitReader: GitReader,
  ) {}

  async execute(command: MergeBranchesCommand): Promise<{ response: string }> {
    const workspace = await this.workspaceRepository.findById(command.workspaceId);
    if (!workspace) {
      throw new ApplicationError('WORKSPACE_NOT_FOUND', `Workspace not found: ${command.workspaceId}`);
    }
    if (!workspace.isActive()) {
      throw new ApplicationError('INVALID_STATE', '활성 워크스페이스에서만 머지할 수 있습니다.');
    }

    // Collect branches per gitId from selected workflow runs
    const mergePlan = new Map<string, { gitId: string; branches: string[] }>();

    for (const runId of command.workflowRunIds) {
      const workTrees = await this.workTreeRepository.findByWorkflowRunId(
        WorkflowRunId.create(runId),
      );
      for (const wt of workTrees) {
        const gitIdStr = String(wt.gitId);
        const existing = mergePlan.get(gitIdStr) ?? { gitId: gitIdStr, branches: [] };
        if (!existing.branches.includes(wt.branch)) {
          existing.branches.push(wt.branch);
        }
        mergePlan.set(gitIdStr, existing);
      }
    }

    if (mergePlan.size === 0) {
      return { response: '머지할 브랜치가 없습니다.' };
    }

    // Build merge instruction message for the agent
    const gitInfos = await this.gitReader.findByIds(
      [...mergePlan.keys()].map((id) => GitId.create(id)),
    );

    let message = '다음 브랜치들을 현재 워크스페이스의 각 프로젝트에 머지해주세요.\n\n';
    for (const [gitId, plan] of mergePlan) {
      const gitInfo = gitInfos.find((g) => String(g.id) === gitId);
      const projectName = gitInfo?.url.split('/').pop()?.replace('.git', '') ?? gitId;
      message += `프로젝트: ${projectName}\n`;
      message += `머지할 브랜치: ${plan.branches.join(', ')}\n`;
      const wsGitRef = workspace.gitRefs.find((r) => String(r.gitId) === gitId);
      if (wsGitRef) {
        message += `현재 브랜치: ${wsGitRef.branchName}\n`;
      }
      message += '\n';
    }

    message += '각 프로젝트 디렉토리에서 git merge 명령으로 브랜치를 통합해주세요. ';
    message += '충돌이 발생하면 적절히 해결해주세요.';

    const result = await this.agentService.sendQueryForWorkspace(
      String(command.workspaceId),
      message,
    );

    return { response: result.response };
  }
}
