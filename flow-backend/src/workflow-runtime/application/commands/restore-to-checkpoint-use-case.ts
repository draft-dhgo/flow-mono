import { Injectable } from '@nestjs/common';
import {
  WorkflowRunRepository, WorkExecutionRepository,
  CheckpointRepository, WorkTreeRepository,
  WorkflowSpaceRepository, ReportRepository,
  WorkflowRunStatus,
} from '../../domain/index.js';
import type { WorkflowRunId, CheckpointId, WorkExecutionId } from '../../domain/index.js';
import { FileSystem } from '../../domain/ports/file-system.js';
import { GitService } from '@common/ports/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class WorkflowRunNotFoundError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_NOT_FOUND', `WorkflowRun ${id} not found`);
  }
}

export class WorkflowRunCannotRestoreError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_CANNOT_RESTORE', `WorkflowRun ${id} is RUNNING — pause it first before restoring`);
  }
}

export class CheckpointNotFoundError extends ApplicationError {
  constructor(id: CheckpointId) {
    super('CHECKPOINT_NOT_FOUND', `Checkpoint ${id} not found`);
  }
}

export class CheckpointMismatchError extends ApplicationError {
  constructor(checkpointId: CheckpointId, workflowRunId: WorkflowRunId) {
    super('CHECKPOINT_MISMATCH', `Checkpoint ${checkpointId} does not belong to WorkflowRun ${workflowRunId}`);
  }
}

export interface RestoreToCheckpointCommand {
  readonly workflowRunId: WorkflowRunId;
  readonly checkpointId: CheckpointId;
}

@Injectable()
export class RestoreToCheckpointUseCase {
  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly checkpointRepository: CheckpointRepository,
    private readonly workExecutionRepository: WorkExecutionRepository,
    private readonly reportRepository: ReportRepository,
    private readonly workTreeRepository: WorkTreeRepository,
    private readonly workflowSpaceRepository: WorkflowSpaceRepository,
    private readonly gitService: GitService,
    private readonly fileSystem: FileSystem,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: RestoreToCheckpointCommand): Promise<void> {
    const run = await this.workflowRunRepository.findById(command.workflowRunId);
    if (!run) {
      throw new WorkflowRunNotFoundError(command.workflowRunId);
    }

    if (run.status === WorkflowRunStatus.RUNNING) {
      throw new WorkflowRunCannotRestoreError(command.workflowRunId);
    }

    const checkpoint = await this.checkpointRepository.findById(command.checkpointId);
    if (!checkpoint) {
      throw new CheckpointNotFoundError(command.checkpointId);
    }

    if (checkpoint.workflowRunId !== run.id) {
      throw new CheckpointMismatchError(command.checkpointId, command.workflowRunId);
    }

    // Git worktree reset
    const workTrees = await this.workTreeRepository.findByWorkflowRunId(run.id);
    for (const wt of workTrees) {
      const commitHash = checkpoint.getCommitHash(wt.gitId);
      if (commitHash) {
        await this.gitService.reset(wt.path, commitHash);
      }
    }

    // Trim execution history
    const trimmedExecutionIds = run.workExecutionIds.slice(checkpoint.workSequence);
    run.restoreToCheckpoint(checkpoint.workSequence);

    // Cleanup workspaces
    await this.cleanupWorkSpaces(run.id, trimmedExecutionIds);

    // Cleanup executions
    await this.cleanupExecutions(run.id, trimmedExecutionIds);

    // Save and publish
    await this.workflowRunRepository.save(run);
    await this.eventPublisher.publishAll(run.clearDomainEvents());
  }

  private async cleanupWorkSpaces(
    workflowRunId: WorkflowRunId,
    trimmedExecutionIds: ReadonlyArray<WorkExecutionId>,
  ): Promise<void> {
    if (trimmedExecutionIds.length === 0) return;

    const workflowSpace = await this.workflowSpaceRepository.findByWorkflowRunId(workflowRunId);
    if (!workflowSpace) return;

    const removedWorkSpaces = workflowSpace.removeWorkSpacesByExecutionIds(trimmedExecutionIds);
    for (const ws of removedWorkSpaces) {
      try {
        await this.fileSystem.deleteDirectory(ws.path);
      } catch {
        // skip if directory already removed
      }
    }
    await this.workflowSpaceRepository.save(workflowSpace);
  }

  private async cleanupExecutions(
    workflowRunId: WorkflowRunId,
    executionIds: ReadonlyArray<WorkExecutionId>,
  ): Promise<void> {
    if (executionIds.length === 0) return;

    const executionIdSet = new Set<WorkExecutionId>(executionIds);
    const reports = await this.reportRepository.findByWorkflowRunId(workflowRunId);

    for (const report of reports) {
      if (executionIdSet.has(report.workExecutionId)) {
        if (report.filePath) {
          try {
            await this.fileSystem.deleteFile(report.filePath);
          } catch {
            // skip if file already removed
          }
        }
        await this.reportRepository.delete(report.id);
      }
    }

    for (const weId of executionIds) {
      await this.workExecutionRepository.delete(weId);
    }
  }
}
