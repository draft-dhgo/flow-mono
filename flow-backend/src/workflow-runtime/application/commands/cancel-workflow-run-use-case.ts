import { Injectable, Logger } from '@nestjs/common';
import {
  WorkflowRunRepository, WorkExecutionRepository,
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

export class WorkflowRunCannotCancelError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_CANNOT_CANCEL', `WorkflowRun ${id} cannot be cancelled in its current state`);
  }
}

export interface CancelWorkflowRunCommand {
  readonly workflowRunId: WorkflowRunId;
  readonly reason?: string;
}

@Injectable()
export class CancelWorkflowRunUseCase {
  private readonly logger = new Logger(CancelWorkflowRunUseCase.name);

  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workExecutionRepository: WorkExecutionRepository,
    private readonly agentService: AgentService,
    private readonly eventPublisher: EventPublisher,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: CancelWorkflowRunCommand): Promise<void> {
    // TRY: Load and validate
    const run = await this.workflowRunRepository.findById(command.workflowRunId);
    if (!run) {
      throw new WorkflowRunNotFoundError(command.workflowRunId);
    }

    if (run.isTerminal()) {
      throw new WorkflowRunCannotCancelError(command.workflowRunId);
    }

    // CONFIRM: Side effects (best-effort) + state transitions + TX save
    const workExecutions = await this.workExecutionRepository.findByWorkflowRunId(run.id);
    for (const we of workExecutions) {
      if (!we.isTerminal) {
        try { await this.agentService.stopSession(we.id); }
        catch (err: unknown) { this.logger.warn('Failed to stop agent session: weId=' + we.id, err); }
        try { await this.agentService.deleteSession(we.id); }
        catch (err: unknown) { this.logger.warn('Failed to delete agent session: weId=' + we.id, err); }
        we.cancel();
      }
    }

    run.cancel(command.reason);

    await this.unitOfWork.run(async () => {
      await this.workExecutionRepository.saveAll(workExecutions);
      await this.workflowRunRepository.save(run);

      const allEvents = [
        ...run.clearDomainEvents(),
        ...workExecutions.flatMap((we) => we.clearDomainEvents()),
      ];
      await this.eventPublisher.publishAll(allEvents);
    });
  }
}
