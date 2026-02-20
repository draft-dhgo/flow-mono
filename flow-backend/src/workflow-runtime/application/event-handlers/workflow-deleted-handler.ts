import { Injectable, Logger } from '@nestjs/common';
import { WorkflowRunRepository } from '../../domain/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import type { WorkflowDeleted } from '@common/events/index.js';
import { CancelWorkflowRunUseCase } from '../commands/cancel-workflow-run-use-case.js';

@Injectable()
export class WorkflowDeletedHandler {
  private readonly logger = new Logger(WorkflowDeletedHandler.name);

  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly cancelWorkflowRunUseCase: CancelWorkflowRunUseCase,
  ) {}

  async handle(event: WorkflowDeleted): Promise<void> {
    const runs = await this.workflowRunRepository.findByWorkflowId(
      event.payload.workflowId as WorkflowId,
    );
    for (const run of runs) {
      if (!run.isTerminal()) {
        try {
          await this.cancelWorkflowRunUseCase.execute({
            workflowRunId: run.id,
            reason: `Parent workflow ${event.payload.workflowId} deleted`,
          });
        } catch (error: unknown) {
          this.logger.error(
            `Failed to cancel workflow run ${run.id} during ${event.eventType}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    }
  }
}
