import { Inject, Injectable } from '@nestjs/common';
import {
  WorkflowRunRepository,
  WorkTreeRepository,
} from '../../domain/index.js';
import { WorkflowConfigReader, GitService, GitReader } from '@common/ports/index.js';

export interface WorkLineageRepoInfo {
  gitId: string;
  gitUrl: string;
  branch: string;
  commitHash: string;
  commitCount: number;
}

export interface WorkLineageRunInfo {
  workflowRunId: string;
  workflowName: string;
  runStatus: string;
  repos: WorkLineageRepoInfo[];
}

export interface WorkLineageEntry {
  issueKey: string;
  runs: WorkLineageRunInfo[];
}

@Injectable()
export class GetWorkLineageQuery {
  constructor(
    @Inject(WorkflowRunRepository) private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workTreeRepository: WorkTreeRepository,
    private readonly gitService: GitService,
    private readonly gitReader: GitReader,
    private readonly workflowConfigReader: WorkflowConfigReader,
  ) {}

  async execute(): Promise<WorkLineageEntry[]> {
    const runs = await this.workflowRunRepository.findAll();

    const groupedByIssueKey = new Map<string, typeof runs>();
    for (const run of runs) {
      const existing = groupedByIssueKey.get(run.issueKey) ?? [];
      existing.push(run);
      groupedByIssueKey.set(run.issueKey, existing);
    }

    const entries: WorkLineageEntry[] = [];

    for (const [issueKey, runsForKey] of groupedByIssueKey) {
      const runInfos: WorkLineageRunInfo[] = [];

      for (const run of runsForKey) {
        const workflow = await this.workflowConfigReader.findById(run.workflowId);
        const workflowName = workflow?.name ?? 'Unknown';

        const workTrees = await this.workTreeRepository.findByWorkflowRunId(run.id);

        const gitIds = workTrees.map((wt) => wt.gitId);
        const gitInfos = gitIds.length > 0 ? await this.gitReader.findByIds(gitIds) : [];

        const repos: WorkLineageRepoInfo[] = [];

        for (const wt of workTrees) {
          const gitInfo = gitInfos.find((g) => g.id === wt.gitId);
          try {
            const branch = await this.gitService.getCurrentBranch(wt.path);
            const commitHash = await this.gitService.getCurrentCommit(wt.path);

            const gitRef = run.gitRefPool.find((ref) => ref.gitId === wt.gitId);
            const baseBranch = gitRef?.baseBranch ?? 'main';

            let commitCount = 0;
            try {
              commitCount = await this.gitService.getCommitCount(wt.path, baseBranch);
            } catch {
              commitCount = 0;
            }

            repos.push({
              gitId: wt.gitId,
              gitUrl: gitInfo?.url ?? '',
              branch,
              commitHash,
              commitCount,
            });
          } catch {
            repos.push({
              gitId: wt.gitId,
              gitUrl: gitInfo?.url ?? '',
              branch: wt.branch,
              commitHash: 'N/A',
              commitCount: 0,
            });
          }
        }

        runInfos.push({
          workflowRunId: run.id,
          workflowName,
          runStatus: run.status,
          repos,
        });
      }

      entries.push({ issueKey, runs: runInfos });
    }

    entries.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
    return entries;
  }
}
