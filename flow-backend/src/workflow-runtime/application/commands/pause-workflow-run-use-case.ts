import { Injectable, Logger } from '@nestjs/common';
import {
  WorkflowRunRepository,
} from '../../domain/index.js';
import type { WorkflowRunId } from '../../domain/index.js';
import { AgentService } from '@common/ports/index.js';
import { EventPublisher, UnitOfWork } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class WorkflowRunNotFoundError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_NOT_FOUND', `WorkflowRun ${id} not found`);
  }
}

export class WorkflowRunCannotPauseError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_CANNOT_PAUSE', `WorkflowRun ${id} cannot be paused in its current state`);
  }
}

export interface PauseWorkflowRunCommand {
  readonly workflowRunId: WorkflowRunId;
}

@Injectable()
export class PauseWorkflowRunUseCase {
  private readonly logger = new Logger(PauseWorkflowRunUseCase.name);

  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly agentService: AgentService,
    private readonly eventPublisher: EventPublisher,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: PauseWorkflowRunCommand): Promise<void> {
    // TRY: Load and validate
    const run = await this.workflowRunRepository.findById(command.workflowRunId);
    if (!run) {
      throw new WorkflowRunNotFoundError(command.workflowRunId);
    }

    if (!run.canPause()) {
      throw new WorkflowRunCannotPauseError(command.workflowRunId);
    }

    // CONFIRM: Side effects (best-effort) + state transition + TX save
    const currentWeId = run.currentWorkExecutionId;
    if (currentWeId) {
      try { await this.agentService.stopSession(currentWeId); }
      catch (err: unknown) { this.logger.warn('Failed to stop agent session: weId=' + currentWeId, err); }
      try { await this.agentService.deleteSession(currentWeId); }
      catch (err: unknown) { this.logger.warn('Failed to delete agent session: weId=' + currentWeId, err); }
    }

    run.pause();

    await this.unitOfWork.run(async () => {
      await this.workflowRunRepository.save(run);
      await this.eventPublisher.publishAll(run.clearDomainEvents());
    });
  }
}
