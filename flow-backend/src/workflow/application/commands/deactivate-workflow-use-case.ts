import { Injectable } from '@nestjs/common';
import { WorkflowRepository } from '../../domain/index.js';
import type { WorkflowId } from '../../domain/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class WorkflowNotFoundForDeactivationError extends ApplicationError {
  constructor(workflowId: string) {
    super('WORKFLOW_NOT_FOUND', `Workflow not found for deactivation: ${workflowId}`);
  }
}

export interface DeactivateWorkflowCommand {
  readonly workflowId: WorkflowId;
}

@Injectable()
export class DeactivateWorkflowUseCase {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: DeactivateWorkflowCommand): Promise<void> {
    const workflow = await this.workflowRepository.findById(command.workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundForDeactivationError(command.workflowId);
    }

    workflow.deactivate();

    await this.workflowRepository.save(workflow);

    const events = workflow.clearDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }
  }
}
