import { Injectable, Logger } from '@nestjs/common';
import { WorkflowRunRepository } from '../../domain/index.js';
import type { WorkExecutionStarted } from '@common/events/index.js';
import type { WorkflowRunId } from '@common/ids/index.js';

@Injectable()
export class WorkExecutionStartedHandler {
  private readonly logger = new Logger(WorkExecutionStartedHandler.name);

  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
  ) {}

  async handle(event: WorkExecutionStarted): Promise<void> {
    const { workExecutionId, workflowRunId, sequence } = event.payload;
    this.logger.log(
      `WorkExecutionStarted: weId=${workExecutionId}, runId=${workflowRunId}, seq=${sequence}`,
    );

    const run = await this.workflowRunRepository.findById(workflowRunId as WorkflowRunId);
    if (!run) {
      this.logger.warn('WorkflowRun not found for WorkExecutionStarted: runId=' + workflowRunId);
      return;
    }

    // Track that work execution has started — the run entity already knows via addWorkExecution,
    // but this handler enables cross-cutting concerns like metrics and SSE notifications.
  }
}
