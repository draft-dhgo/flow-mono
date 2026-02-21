import { Injectable, Inject } from '@nestjs/common';
import { WorkflowRunRepository } from '../../domain/ports/workflow-run-repository.js';
import { WorkTreeRepository } from '../../domain/ports/work-tree-repository.js';
import { WorkflowRunStatus } from '../../domain/value-objects/index.js';
import { GitService, GitReader } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/application-error.js';
import type { WorkflowRunId } from '@common/ids/index.js';

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
export class PushBranchesUseCase {
  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workTreeRepository: WorkTreeRepository,
    @Inject(GitService) private readonly gitService: GitService,
    @Inject(GitReader) private readonly gitReader: GitReader,
  ) {}

  async execute(workflowRunId: WorkflowRunId): Promise<PushBranchesResult> {
    const run = await this.workflowRunRepository.findById(workflowRunId);
    if (!run) {
      throw new ApplicationError('WORKFLOW_RUN_NOT_FOUND', `Workflow run not found: ${workflowRunId}`);
    }

    if (run.status !== WorkflowRunStatus.COMPLETED) {
      throw new ApplicationError('INVALID_STATE', '완료된 워크플로우 런만 푸시할 수 있습니다.');
    }

    const workTrees = await this.workTreeRepository.findByWorkflowRunId(workflowRunId);
    if (workTrees.length === 0) {
      return { results: [] };
    }

    const gitInfos = await this.gitReader.findByIds(workTrees.map((wt) => wt.gitId));

    const results: PushResult[] = [];
    for (const wt of workTrees) {
      const gitInfo = gitInfos.find((g) => String(g.id) === String(wt.gitId));
      if (!gitInfo) {
        results.push({ gitId: String(wt.gitId), branch: wt.branch, success: false, error: 'Git 레포 정보를 찾을 수 없습니다.' });
        continue;
      }

      try {
        const currentBranch = await this.gitService.getCurrentBranch(wt.path);
        await this.gitService.push(wt.path, currentBranch);
        results.push({ gitId: String(wt.gitId), branch: currentBranch, success: true, error: null });
      } catch (err: unknown) {
        results.push({
          gitId: String(wt.gitId),
          branch: wt.branch,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { results };
  }
}
