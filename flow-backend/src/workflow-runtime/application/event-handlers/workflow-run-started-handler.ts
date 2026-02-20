import { Injectable, Logger } from '@nestjs/common';
import { WorkflowPipelineService } from '@common/ports/index.js';
import type { WorkflowRunStarted } from '@common/events/index.js';
import type { WorkflowRunId } from '@common/ids/index.js';

@Injectable()
export class WorkflowRunStartedHandler {
  private readonly logger = new Logger(WorkflowRunStartedHandler.name);

  constructor(
    private readonly pipelineService: WorkflowPipelineService,
  ) {}

  async handle(event: WorkflowRunStarted): Promise<void> {
    const workflowRunId = event.payload.workflowRunId as WorkflowRunId;
    this.logger.log('WorkflowRunStarted received: runId=' + workflowRunId);
    try {
      await this.pipelineService.runPipeline(workflowRunId);
    } catch (error: unknown) {
      this.logger.error(
        'Pipeline failed for runId=' + workflowRunId,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
