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
import { EventPublisher, UnitOfWork } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';
import { CompensationStack } from '@common/application/compensation-stack.js';

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
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: RestoreToCheckpointCommand): Promise<void> {
    // TRY: Load and validate
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

    // CONFIRM: Git reset with compensation + cleanup + save
    const compensations = new CompensationStack();

    try {
      const workTrees = await this.workTreeRepository.findByWorkflowRunId(run.id);
      for (const wt of workTrees) {
        const commitHash = checkpoint.getCommitHash(wt.gitId);
        if (commitHash) {
          const originalHash = await this.gitService.getCurrentCommit(wt.path);
          await this.gitService.reset(wt.path, commitHash);
          compensations.push(async () => {
            try { await this.gitService.reset(wt.path, originalHash); } catch { /* best-effort */ }
          });
        }
      }

      const trimmedExecutionIds = run.workExecutionIds.slice(checkpoint.workSequence);
      run.restoreToCheckpoint(checkpoint.workSequence);

      await this.cleanupWorkSpaces(run.id, trimmedExecutionIds);
      await this.cleanupExecutions(run.id, trimmedExecutionIds);

      await this.unitOfWork.run(async () => {
        await this.workflowRunRepository.save(run);
        await this.eventPublisher.publishAll(run.clearDomainEvents());
      });
    } catch (error) {
      // CANCEL: Restore git to original state
      await compensations.runAll();
      throw error;
    }
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
