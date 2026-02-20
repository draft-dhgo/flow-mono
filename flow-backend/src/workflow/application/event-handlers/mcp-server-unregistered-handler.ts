import { Injectable, Logger } from '@nestjs/common';
import { WorkflowRepository } from '../../domain/index.js';
import { EventPublisher } from '@common/ports/index.js';
import type { McpServerUnregistered } from '@common/events/index.js';

@Injectable()
export class McpServerUnregisteredHandler {
  private readonly logger = new Logger(McpServerUnregisteredHandler.name);

  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async handle(event: McpServerUnregistered): Promise<void> {
    const workflowsWithMcp = await this.workflowRepository.findByMcpServerId(event.payload.mcpServerId);
    for (const workflow of workflowsWithMcp) {
      try {
        workflow.markMcpServerRefInvalid(event.payload.mcpServerId);
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
