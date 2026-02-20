import { Injectable } from '@nestjs/common';
import {
  WorkflowRunRepository, WorkNodeConfig, TaskNodeConfig,
} from '../../domain/index.js';
import type {
  WorkflowRunId, GitRefNodeConfig, McpServerRefNodeConfig,
} from '../../domain/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class WorkflowRunNotFoundError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_NOT_FOUND', `WorkflowRun ${id} not found`);
  }
}

export interface AddWorkNodeCommand {
  readonly workflowRunId: WorkflowRunId;
  readonly model: string;
  readonly taskConfigs: TaskNodeConfig[];
  readonly gitRefConfigs?: GitRefNodeConfig[];
  readonly mcpServerRefConfigs?: McpServerRefNodeConfig[];
  readonly pauseAfter?: boolean;
}

@Injectable()
export class AddWorkNodeUseCase {
  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: AddWorkNodeCommand): Promise<void> {
    const run = await this.workflowRunRepository.findById(command.workflowRunId);
    if (!run) {
      throw new WorkflowRunNotFoundError(command.workflowRunId);
    }

    const config = WorkNodeConfig.create({
      sequence: 0, // addWorkNodeConfig will assign the correct sequence
      model: command.model,
      taskConfigs: command.taskConfigs,
      gitRefConfigs: command.gitRefConfigs,
      mcpServerRefConfigs: command.mcpServerRefConfigs,
      pauseAfter: command.pauseAfter,
    });

    run.addWorkNodeConfig(config);

    await this.workflowRunRepository.save(run);
    await this.eventPublisher.publishAll(run.clearDomainEvents());
  }
}
