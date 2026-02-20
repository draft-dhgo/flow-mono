import { Injectable } from '@nestjs/common';
import {
  WorkflowRunRepository, WorkExecutionRepository,
  CheckpointRepository, WorkTreeRepository,
  WorkflowSpaceRepository, ReportRepository,
} from '../../domain/index.js';
import type { WorkflowRunId, CheckpointId, WorkExecutionId } from '../../domain/index.js';
import { WorkflowRunStatus, WorkflowRun } from '../../domain/index.js';
import { FileSystem } from '../../domain/ports/file-system.js';
import { GitService } from '@common/ports/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class WorkflowRunNotFoundError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_NOT_FOUND', `WorkflowRun ${id} not found`);
  }
}

export class WorkflowRunCannotResumeError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_CANNOT_RESUME', `WorkflowRun ${id} cannot be resumed in its current state`);
  }
}

export class CheckpointNotFoundError extends ApplicationError {
  constructor(id: CheckpointId) {
    super('CHECKPOINT_NOT_FOUND', `Checkpoint ${id} not found`);
  }
}

export interface ResumeWorkflowRunCommand {
  readonly workflowRunId: WorkflowRunId;
  readonly checkpointId?: CheckpointId;
}

@Injectable()
export class ResumeWorkflowRunUseCase {
  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workExecutionRepository: WorkExecutionRepository,
    private readonly checkpointRepository: CheckpointRepository,
    private readonly workTreeRepository: WorkTreeRepository,
    private readonly workflowSpaceRepository: WorkflowSpaceRepository,
    private readonly reportRepository: ReportRepository,
    private readonly fileSystem: FileSystem,
    private readonly gitService: GitService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: ResumeWorkflowRunCommand): Promise<void> {
    const run = await this.workflowRunRepository.findById(command.workflowRunId);
    if (!run) {
      throw new WorkflowRunNotFoundError(command.workflowRunId);
    }

    if (!run.canResume()) {
      throw new WorkflowRunCannotResumeError(command.workflowRunId);
    }

    const wasPaused = run.status === WorkflowRunStatus.PAUSED;

    if (wasPaused) {
      if (command.checkpointId) {
        // 명시적 checkpoint restore
        await this.restoreToCheckpoint(run, command.checkpointId);
      } else if (run.currentWorkIndex > 0 && !run.restoredToCheckpoint) {
        // 자동 revert: 이전 work의 checkpoint 탐색
        await this.autoRevertToPreviousCheckpoint(run);
      }
    }

    run.resume();

    await this.workflowRunRepository.save(run);

    const allEvents = run.clearDomainEvents();
    await this.eventPublisher.publishAll(allEvents);
  }

  private async restoreToCheckpoint(run: WorkflowRun, checkpointId: CheckpointId): Promise<void> {
    const checkpoint = await this.checkpointRepository.findById(checkpointId);
    if (!checkpoint) {
      throw new CheckpointNotFoundError(checkpointId);
    }

    const workTrees = await this.workTreeRepository.findByWorkflowRunId(run.id);
    for (const wt of workTrees) {
      const commitHash = checkpoint.getCommitHash(wt.gitId);
      if (commitHash) {
        await this.gitService.reset(wt.path, commitHash);
      }
    }

    const trimmedExecutionIds = run.workExecutionIds.slice(checkpoint.workSequence);
    run.restoreToCheckpoint(checkpoint.workSequence);
    await this.cleanupWorkSpaces(run, trimmedExecutionIds);
    await this.cleanupExecutions(run, trimmedExecutionIds);
  }

  private async autoRevertToPreviousCheckpoint(run: WorkflowRun): Promise<void> {
    const checkpoints = await this.checkpointRepository.findByWorkflowRunId(run.id);
    const prevCheckpoint = checkpoints
      .filter((cp) => cp.workSequence < run.currentWorkIndex)
      .sort((a, b) => b.workSequence - a.workSequence)[0];

    if (prevCheckpoint) {
      const workTrees = await this.workTreeRepository.findByWorkflowRunId(run.id);
      for (const wt of workTrees) {
        const commitHash = prevCheckpoint.getCommitHash(wt.gitId);
        if (commitHash) {
          await this.gitService.reset(wt.path, commitHash);
        }
      }
    }

    // trim work executions for current work index (새로 생성됨)
    const trimmedExecutionIds = run.workExecutionIds.slice(run.currentWorkIndex);
    run.restoreToCheckpoint(run.currentWorkIndex);
    await this.cleanupWorkSpaces(run, trimmedExecutionIds);
    await this.cleanupExecutions(run, trimmedExecutionIds);
  }

  private async cleanupExecutions(run: WorkflowRun, executionIds: ReadonlyArray<WorkExecutionId>): Promise<void> {
    if (executionIds.length === 0) return;

    const executionIdSet = new Set<WorkExecutionId>(executionIds);
    const reports = await this.reportRepository.findByWorkflowRunId(run.id);

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

  private async cleanupWorkSpaces(run: WorkflowRun, trimmedExecutionIds: ReadonlyArray<WorkExecutionId>): Promise<void> {
    if (trimmedExecutionIds.length === 0) return;

    const workflowSpace = await this.workflowSpaceRepository.findByWorkflowRunId(run.id);
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
}
