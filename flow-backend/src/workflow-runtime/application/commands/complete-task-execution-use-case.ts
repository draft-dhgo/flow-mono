import { Injectable } from '@nestjs/common';
import { Checkpoint } from '../../domain/index.js';
import {
  WorkflowRunRepository, WorkExecutionRepository,
  CheckpointRepository, WorkTreeRepository,
} from '../../domain/index.js';
import type { WorkExecutionId, CommitHash } from '../../domain/index.js';
import type { DomainEvent } from '@common/events/domain-event.js';
import type { GitId } from '@common/ids/index.js';
import { GitService } from '@common/ports/index.js';
import { EventPublisher, UnitOfWork } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class WorkExecutionNotFoundError extends ApplicationError {
  constructor(id: WorkExecutionId) {
    super('WORK_EXECUTION_NOT_FOUND', `WorkExecution ${id} not found`);
  }
}

export class NoActiveTaskError extends ApplicationError {
  constructor(workExecutionId: WorkExecutionId) {
    super('NO_ACTIVE_TASK', `WorkExecution ${workExecutionId} has no active task`);
  }
}

export class TaskNotCompletedError extends ApplicationError {
  constructor(workExecutionId: WorkExecutionId) {
    super('TASK_NOT_COMPLETED', `Current task for WorkExecution ${workExecutionId} is not completed`);
  }
}

export interface CompleteTaskExecutionCommand {
  readonly workExecutionId: WorkExecutionId;
}

export interface CompleteTaskExecutionResult {
  readonly taskExecutionId: string;
  readonly hasNextTask: boolean;
  readonly isWorkComplete: boolean;
}

@Injectable()
export class CompleteTaskExecutionUseCase {
  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workExecutionRepository: WorkExecutionRepository,
    private readonly checkpointRepository: CheckpointRepository,
    private readonly workTreeRepository: WorkTreeRepository,
    private readonly gitService: GitService,
    private readonly eventPublisher: EventPublisher,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: CompleteTaskExecutionCommand): Promise<CompleteTaskExecutionResult> {
    // TRY: Load, validate, and prepare domain state
    const workExecution = await this.workExecutionRepository.findById(command.workExecutionId);
    if (!workExecution) {
      throw new WorkExecutionNotFoundError(command.workExecutionId);
    }

    const currentTask = workExecution.currentTask();
    if (!currentTask) {
      throw new NoActiveTaskError(command.workExecutionId);
    }

    if (!currentTask.isTerminal) {
      throw new TaskNotCompletedError(command.workExecutionId);
    }

    const taskExecutionId = currentTask.id;
    const hasNextTask = workExecution.advanceToNextTask();
    const isWorkComplete = workExecution.isCompleted;

    let checkpoint: Checkpoint | null = null;

    if (isWorkComplete) {
      const run = await this.workflowRunRepository.findById(workExecution.workflowRunId);
      if (run) {
        // Read-only side effect: collect commit hashes
        const workTrees = await this.workTreeRepository.findByWorkflowRunId(run.id);
        const commitHashes = new Map<GitId, CommitHash>();
        for (const wt of workTrees) {
          try {
            const hash = await this.gitService.getCurrentCommit(wt.path) as CommitHash;
            commitHashes.set(wt.gitId, hash);
          } catch {
            // skip if unable to get commit hash
          }
        }

        if (commitHashes.size > 0) {
          checkpoint = Checkpoint.create({
            workflowRunId: run.id,
            workflowId: workExecution.workflowId,
            workExecutionId: workExecution.id,
            workSequence: workExecution.sequence,
            commitHashes,
          });
        }

        const hasMore = run.advanceWork();
        if (hasMore) {
          const prevConfig = run.getWorkNodeConfig(run.currentWorkIndex - 1);
          if (prevConfig?.pauseAfter) {
            run.await();
          }
        }

        // CONFIRM: Single TX for all saves + events
        await this.unitOfWork.run(async () => {
          if (checkpoint) {
            await this.checkpointRepository.save(checkpoint);
          }
          await this.workflowRunRepository.save(run);
          await this.workExecutionRepository.save(workExecution);

          const allEvents: DomainEvent[] = [
            ...(checkpoint ? checkpoint.clearDomainEvents() : []),
            ...run.clearDomainEvents(),
            ...workExecution.clearDomainEvents(),
          ];
          await this.eventPublisher.publishAll(allEvents);
        });

        return { taskExecutionId, hasNextTask, isWorkComplete };
      }
    }

    // CONFIRM: Simple case (no work complete or no run)
    await this.unitOfWork.run(async () => {
      await this.workExecutionRepository.save(workExecution);
      await this.eventPublisher.publishAll(workExecution.clearDomainEvents());
    });

    return { taskExecutionId, hasNextTask, isWorkComplete };
  }
}
