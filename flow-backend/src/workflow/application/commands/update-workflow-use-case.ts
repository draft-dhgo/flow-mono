import { Injectable } from '@nestjs/common';
import { WorkflowRepository, WorkflowStatus } from '../../domain/index.js';
import type { WorkflowId, WorkDefinition, GitRef, McpServerRef } from '../../domain/index.js';
import { GitReferenceChecker } from '@common/ports/index.js';
import { McpServerReferenceChecker } from '@common/ports/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';
import { GitReferenceNotFoundError, McpServerReferenceNotFoundError } from './create-workflow-use-case.js';

export class WorkflowNotFoundError extends ApplicationError {
  constructor(workflowId: string) {
    super('WORKFLOW_NOT_FOUND', `Workflow not found: ${workflowId}`);
  }
}

export class WorkflowNotInDraftError extends ApplicationError {
  constructor(workflowId: string) {
    super('WORKFLOW_NOT_IN_DRAFT', `Workflow is not in DRAFT status: ${workflowId}`);
  }
}

export interface UpdateWorkflowCommand {
  readonly workflowId: WorkflowId;
  readonly name?: string;
  readonly description?: string;
  readonly workDefinitions?: WorkDefinition[];
  readonly gitRefs?: GitRef[];
  readonly mcpServerRefs?: McpServerRef[];
  readonly seedKeys?: string[];
}

@Injectable()
export class UpdateWorkflowUseCase {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly gitReferenceChecker: GitReferenceChecker,
    private readonly mcpServerReferenceChecker: McpServerReferenceChecker,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: UpdateWorkflowCommand): Promise<void> {
    const workflow = await this.workflowRepository.findById(command.workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(command.workflowId);
    }

    if (workflow.status !== WorkflowStatus.DRAFT) {
      throw new WorkflowNotInDraftError(command.workflowId);
    }

    if (command.gitRefs) {
      await this.validateGitReferences(command.gitRefs);
    }
    if (command.mcpServerRefs) {
      await this.validateMcpServerReferences(command.mcpServerRefs);
    }

    if (command.name !== undefined) {
      workflow.updateName(command.name);
    }
    if (command.description !== undefined) {
      workflow.updateDescription(command.description);
    }
    if (command.gitRefs !== undefined) {
      workflow.updateGitRefs(command.gitRefs);
    }
    if (command.mcpServerRefs !== undefined) {
      workflow.updateMcpServerRefs(command.mcpServerRefs);
    }
    if (command.workDefinitions !== undefined) {
      workflow.updateWorkDefinitions(command.workDefinitions);
    }
    if (command.seedKeys !== undefined) {
      workflow.updateSeedKeys(command.seedKeys);
    }

    await this.workflowRepository.save(workflow);

    const events = workflow.clearDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }
  }

  private async validateGitReferences(gitRefs: GitRef[]): Promise<void> {
    const gitIds = gitRefs.map((ref) => ref.gitId);
    const foundGits = await this.gitReferenceChecker.findByIds(gitIds);
    const foundIds = new Set(foundGits.map((g) => g.id));
    const missingIds = gitIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new GitReferenceNotFoundError(missingIds);
    }
  }

  private async validateMcpServerReferences(mcpServerRefs: McpServerRef[]): Promise<void> {
    if (mcpServerRefs.length === 0) return;

    const mcpServerIds = mcpServerRefs.map((ref) => ref.mcpServerId);
    const foundServers = await this.mcpServerReferenceChecker.findByIds(mcpServerIds);
    const foundIds = new Set(foundServers.map((s) => s.id));
    const missingIds = mcpServerIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new McpServerReferenceNotFoundError(missingIds);
    }
  }
}
