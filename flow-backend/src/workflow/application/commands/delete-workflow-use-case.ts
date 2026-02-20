import { Injectable } from '@nestjs/common';
import { WorkflowRepository } from '../../domain/index.js';
import type { WorkflowId } from '../../domain/index.js';
import { EventPublisher, WorkflowRunActiveChecker } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class WorkflowNotFoundForDeletionError extends ApplicationError {
  constructor(workflowId: string) {
    super('WORKFLOW_NOT_FOUND', `Workflow not found for deletion: ${workflowId}`);
  }
}

export class WorkflowHasActiveRunsError extends ApplicationError {
  constructor(workflowId: string) {
    super('WORKFLOW_HAS_ACTIVE_RUNS', `Cannot delete workflow with active runs: ${workflowId}`);
  }
}

export interface DeleteWorkflowCommand {
  readonly workflowId: WorkflowId;
}

@Injectable()
export class DeleteWorkflowUseCase {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly workflowRunActiveChecker: WorkflowRunActiveChecker,
  ) {}

  async execute(command: DeleteWorkflowCommand): Promise<void> {
    const workflow = await this.workflowRepository.findById(command.workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundForDeletionError(command.workflowId);
    }

    const hasActiveRuns = await this.workflowRunActiveChecker.hasActiveRuns(command.workflowId);
    if (hasActiveRuns) {
      throw new WorkflowHasActiveRunsError(command.workflowId);
    }

    workflow.delete();

    await this.workflowRepository.delete(workflow.id);

    const events = workflow.clearDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }
  }
}
