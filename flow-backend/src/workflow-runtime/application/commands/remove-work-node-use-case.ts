import { Injectable } from '@nestjs/common';
import { WorkflowRunRepository } from '../../domain/index.js';
import type { WorkflowRunId } from '../../domain/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class WorkflowRunNotFoundError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_NOT_FOUND', `WorkflowRun ${id} not found`);
  }
}

export interface RemoveWorkNodeCommand {
  readonly workflowRunId: WorkflowRunId;
  readonly sequence: number;
}

@Injectable()
export class RemoveWorkNodeUseCase {
  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: RemoveWorkNodeCommand): Promise<void> {
    const run = await this.workflowRunRepository.findById(command.workflowRunId);
    if (!run) {
      throw new WorkflowRunNotFoundError(command.workflowRunId);
    }

    run.removeWorkNodeConfig(command.sequence);

    await this.workflowRunRepository.save(run);
    await this.eventPublisher.publishAll(run.clearDomainEvents());
  }
}
