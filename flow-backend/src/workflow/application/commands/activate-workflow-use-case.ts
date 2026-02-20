import { Injectable } from '@nestjs/common';
import { WorkflowRepository } from '../../domain/index.js';
import type { WorkflowId } from '../../domain/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class WorkflowNotFoundForActivationError extends ApplicationError {
  constructor(workflowId: string) {
    super('WORKFLOW_NOT_FOUND', `Workflow not found for activation: ${workflowId}`);
  }
}

export interface ActivateWorkflowCommand {
  readonly workflowId: WorkflowId;
}

@Injectable()
export class ActivateWorkflowUseCase {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: ActivateWorkflowCommand): Promise<void> {
    const workflow = await this.workflowRepository.findById(command.workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundForActivationError(command.workflowId);
    }

    workflow.activate();

    await this.workflowRepository.save(workflow);

    const events = workflow.clearDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }
  }
}
