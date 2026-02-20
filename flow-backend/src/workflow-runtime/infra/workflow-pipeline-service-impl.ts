import { Injectable, Logger } from '@nestjs/common';
import { WorkflowPipelineService } from '@common/ports/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/application-error.js';
import type { WorkflowRunId } from '@common/ids/index.js';
import {
  WorkflowRunRepository, WorkExecutionRepository, WorkflowRunStatus,
} from '../domain/index.js';
import type { WorkExecutionId } from '../domain/index.js';
import { StartNextWorkExecutionUseCase } from '../application/commands/start-next-work-execution-use-case.js';
import { SendQueryUseCase } from '../application/commands/send-query-use-case.js';
import { CompleteTaskExecutionUseCase } from '../application/commands/complete-task-execution-use-case.js';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

@Injectable()
export class WorkflowPipelineServiceImpl extends WorkflowPipelineService {
  private readonly logger = new Logger(WorkflowPipelineServiceImpl.name);

  constructor(
    private readonly startNextWorkExecutionUseCase: StartNextWorkExecutionUseCase,
    private readonly sendQueryUseCase: SendQueryUseCase,
    private readonly completeTaskExecutionUseCase: CompleteTaskExecutionUseCase,
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workExecutionRepository: WorkExecutionRepository,
    private readonly eventPublisher: EventPublisher,
  ) {
    super();
  }

  async runPipeline(workflowRunId: WorkflowRunId): Promise<void> {
    this.logger.log('Pipeline started: runId=' + workflowRunId);
    try {
      while (true) {
        const run = await this.workflowRunRepository.findById(workflowRunId);
        if (!run || run.status !== WorkflowRunStatus.RUNNING) break;

        const startResult = await this.startNextWorkExecutionUseCase.execute({ workflowRunId });
        if (startResult.isComplete || !startResult.workExecutionId) break;

        await this.runWorkExecution(startResult.workExecutionId as WorkExecutionId);

        const updatedRun = await this.workflowRunRepository.findById(workflowRunId);
        if (!updatedRun || updatedRun.status !== WorkflowRunStatus.RUNNING) break;
      }
    } catch (err: unknown) {
      this.logger.error('Pipeline error: runId=' + workflowRunId, err);
    } finally {
      this.logger.log('Pipeline ended: runId=' + workflowRunId);
    }
  }

  private async runWorkExecution(weId: WorkExecutionId): Promise<void> {
    while (true) {
      try {
        await this.sendQueryWithRetry(weId);
      } catch (err: unknown) {
        this.logger.error('Query failed after retries: weId=' + weId, err);
        await this.handleQueryFailure(weId);
        return;
      }

      const result = await this.completeTaskExecutionUseCase.execute({ workExecutionId: weId });
      if (!result.hasNextTask || result.isWorkComplete) return;
    }
  }

  private async sendQueryWithRetry(weId: WorkExecutionId): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.sendQueryUseCase.execute({ workExecutionId: weId });
        return;
      } catch (err: unknown) {
        lastError = err;
        if (!this.isRetryable(err) || attempt === MAX_RETRIES) break;
        await this.delay(RETRY_DELAY_MS);
      }
    }

    throw lastError;
  }

  private async handleQueryFailure(weId: WorkExecutionId): Promise<void> {
    try {
      const workExecution = await this.workExecutionRepository.findById(weId);
      if (!workExecution || workExecution.isTerminal) return;

      workExecution.advanceToNextTask();
      await this.workExecutionRepository.save(workExecution);

      const run = await this.workflowRunRepository.findById(workExecution.workflowRunId);
      if (!run) return;

      if (run.canPause()) {
        run.pause();
      }
      await this.workflowRunRepository.save(run);

      const allEvents = [
        ...workExecution.clearDomainEvents(),
        ...run.clearDomainEvents(),
      ];
      await this.eventPublisher.publishAll(allEvents);
    } catch (failureErr: unknown) {
      this.logger.error('Failed to handle query failure:', failureErr);
    }
  }

  private isRetryable(err: unknown): boolean {
    if (err instanceof ApplicationError && err.code.includes('NOT_FOUND')) {
      return false;
    }
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
