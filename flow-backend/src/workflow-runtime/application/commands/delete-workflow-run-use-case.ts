import { Injectable } from '@nestjs/common';
import {
  WorkflowRunRepository, WorkExecutionRepository, ReportRepository,
  CheckpointRepository, WorkflowSpaceRepository, WorkTreeRepository,
  FileSystem,
} from '../../domain/index.js';
import type { WorkflowRunId } from '../../domain/index.js';
import { ApplicationError } from '@common/errors/index.js';
import { GitService, GitReader, WorkflowConfigReader } from '@common/ports/index.js';

export class WorkflowRunNotFoundError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_NOT_FOUND', `WorkflowRun ${id} not found`);
  }
}

export class WorkflowRunNotTerminalError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_NOT_TERMINAL', `WorkflowRun ${id} must be in a terminal state to delete`);
  }
}

export interface DeleteWorkflowRunCommand {
  readonly workflowRunId: WorkflowRunId;
}

@Injectable()
export class DeleteWorkflowRunUseCase {
  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workExecutionRepository: WorkExecutionRepository,
    private readonly reportRepository: ReportRepository,
    private readonly checkpointRepository: CheckpointRepository,
    private readonly workflowSpaceRepository: WorkflowSpaceRepository,
    private readonly workTreeRepository: WorkTreeRepository,
    private readonly fileSystem: FileSystem,
    private readonly gitService: GitService,
    private readonly gitReader: GitReader,
    private readonly workflowConfigReader: WorkflowConfigReader,
  ) {}

  async execute(command: DeleteWorkflowRunCommand): Promise<void> {
    const run = await this.workflowRunRepository.findById(command.workflowRunId);
    if (!run) {
      throw new WorkflowRunNotFoundError(command.workflowRunId);
    }

    if (!run.isTerminal()) {
      throw new WorkflowRunNotTerminalError(command.workflowRunId);
    }

    const workflowSpace = await this.workflowSpaceRepository.findByWorkflowRunId(run.id);
    if (workflowSpace) {
      try {
        await this.fileSystem.deleteDirectory(workflowSpace.path);
      } catch {
        // best-effort cleanup
      }
      await this.workflowSpaceRepository.delete(workflowSpace.id);
    }

    // Git worktree & branch cleanup
    const workTrees = await this.workTreeRepository.findByWorkflowRunId(run.id);
    const gitIds = [...new Set(workTrees.map((wt) => wt.gitId))];
    const gitInfos = gitIds.length > 0 ? await this.gitReader.findByIds(gitIds) : [];

    for (const wt of workTrees) {
      const gitInfo = gitInfos.find((g) => g.id === wt.gitId);
      try {
        if (gitInfo) {
          await this.gitService.deleteWorktree(gitInfo.localPath, wt.path);
        } else {
          await this.fileSystem.deleteDirectory(wt.path);
        }
      } catch {
        try { await this.fileSystem.deleteDirectory(wt.path); } catch { /* best-effort */ }
      }
    }

    const workflow = await this.workflowConfigReader.findById(run.workflowId);
    if (workflow) {
      const branchName = workflow.branchStrategy.replace('{issueKey}', run.issueKey);
      for (const gitInfo of gitInfos) {
        try {
          const exists = await this.gitService.branchExists(gitInfo.localPath, branchName);
          if (exists) {
            await this.gitService.deleteBranch(gitInfo.localPath, branchName);
          }
        } catch {
          // best-effort
        }
      }
    }

    await this.workTreeRepository.deleteByWorkflowRunId(run.id);

    await this.reportRepository.deleteByWorkflowRunId(run.id);
    await this.checkpointRepository.deleteByWorkflowRunId(run.id);
    await this.workExecutionRepository.deleteByWorkflowRunId(run.id);
    await this.workflowRunRepository.delete(run.id);
  }
}
