import { Injectable, Logger } from '@nestjs/common';
import { WorkflowRepository } from '../../domain/index.js';
import { EventPublisher } from '@common/ports/index.js';
import type { GitDeleted } from '@common/events/index.js';

@Injectable()
export class GitDeletedHandler {
  private readonly logger = new Logger(GitDeletedHandler.name);

  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async handle(event: GitDeleted): Promise<void> {
    const workflowsWithGit = await this.workflowRepository.findByGitId(event.payload.gitId);
    for (const workflow of workflowsWithGit) {
      try {
        workflow.markGitRefInvalid(event.payload.gitId);
        await this.workflowRepository.save(workflow);

        const workflowEvents = workflow.clearDomainEvents();
        if (workflowEvents.length > 0) {
          await this.eventPublisher.publishAll(workflowEvents);
        }
      } catch (error: unknown) {
        this.logger.error(
          `Failed to handle ${event.eventType} for workflow ${workflow.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
