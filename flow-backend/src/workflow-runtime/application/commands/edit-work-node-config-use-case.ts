import { Injectable } from '@nestjs/common';
import { WorkflowRunRepository } from '../../domain/index.js';
import type {
  WorkflowRunId, TaskNodeConfig, GitRefNodeConfig, McpServerRefNodeConfig,
} from '../../domain/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class WorkflowRunNotFoundError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_NOT_FOUND', `WorkflowRun ${id} not found`);
  }
}

export class WorkNodeConfigNotFoundError extends ApplicationError {
  constructor(workflowRunId: WorkflowRunId, sequence: number) {
    super('WORK_NODE_CONFIG_NOT_FOUND', `WorkNodeConfig at sequence ${sequence} not found in WorkflowRun ${workflowRunId}`);
  }
}

export interface EditWorkNodeConfigCommand {
  readonly workflowRunId: WorkflowRunId;
  readonly sequence: number;
  readonly model?: string;
  readonly taskConfigs?: TaskNodeConfig[];
  readonly gitRefConfigs?: GitRefNodeConfig[];
  readonly mcpServerRefConfigs?: McpServerRefNodeConfig[];
  readonly pauseAfter?: boolean;
}

@Injectable()
export class EditWorkNodeConfigUseCase {
  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: EditWorkNodeConfigCommand): Promise<void> {
    const run = await this.workflowRunRepository.findById(command.workflowRunId);
    if (!run) {
      throw new WorkflowRunNotFoundError(command.workflowRunId);
    }

    const existing = run.getWorkNodeConfig(command.sequence);
    if (!existing) {
      throw new WorkNodeConfigNotFoundError(command.workflowRunId, command.sequence);
    }

    let updated = existing;
    if (command.model !== undefined) updated = updated.withModel(command.model);
    if (command.taskConfigs !== undefined) updated = updated.withTaskConfigs(command.taskConfigs);
    if (command.gitRefConfigs !== undefined) updated = updated.withGitRefConfigs(command.gitRefConfigs);
    if (command.mcpServerRefConfigs !== undefined) updated = updated.withMcpServerRefConfigs(command.mcpServerRefConfigs);
    if (command.pauseAfter !== undefined) updated = updated.withPauseAfter(command.pauseAfter);

    run.updateWorkNodeConfig(command.sequence, updated);

    await this.workflowRunRepository.save(run);
    await this.eventPublisher.publishAll(run.clearDomainEvents());
  }
}
