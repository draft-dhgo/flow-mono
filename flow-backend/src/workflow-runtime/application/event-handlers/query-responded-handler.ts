import { Injectable, Logger } from '@nestjs/common';
import { WorkExecutionRepository } from '../../domain/index.js';
import type { WorkExecutionId } from '../../domain/index.js';
import type { QueryResponded } from '@common/events/index.js';

@Injectable()
export class QueryRespondedHandler {
  private readonly logger = new Logger(QueryRespondedHandler.name);

  constructor(
    private readonly workExecutionRepository: WorkExecutionRepository,
  ) {}

  async handle(event: QueryResponded): Promise<void> {
    const { taskExecutionId, workExecutionId, workflowRunId } = event.payload;
    this.logger.log(
      `QueryResponded: taskId=${taskExecutionId}, weId=${workExecutionId}, runId=${workflowRunId}`,
    );

    const workExecution = await this.workExecutionRepository.findById(
      workExecutionId as WorkExecutionId,
    );
    if (!workExecution) {
      this.logger.warn('WorkExecution not found for QueryResponded: weId=' + workExecutionId);
      return;
    }

    // Handler enables cross-cutting concerns like metrics tracking and SSE notifications
    // for query completion events. The task completion logic is handled by CompleteTaskExecutionUseCase.
  }
}
