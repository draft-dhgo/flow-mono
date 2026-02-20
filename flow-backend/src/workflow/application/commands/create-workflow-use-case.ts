import { Injectable } from '@nestjs/common';
import { Workflow } from '../../domain/index.js';
import { WorkflowRepository } from '../../domain/index.js';
import { BranchStrategy } from '../../domain/index.js';
import type { WorkDefinition, GitRef, McpServerRef } from '../../domain/index.js';
import { GitReferenceChecker } from '@common/ports/index.js';
import { McpServerReferenceChecker } from '@common/ports/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class GitReferenceNotFoundError extends ApplicationError {
  constructor(gitIds: string[]) {
    super('GIT_REFERENCE_NOT_FOUND', `Git references not found: ${gitIds.join(', ')}`);
  }
}

export class McpServerReferenceNotFoundError extends ApplicationError {
  constructor(mcpServerIds: string[]) {
    super('MCP_SERVER_REFERENCE_NOT_FOUND', `MCP server references not found: ${mcpServerIds.join(', ')}`);
  }
}

export class WorkflowCreationError extends ApplicationError {
  constructor(reason: string) {
    super('WORKFLOW_CREATION_FAILED', `Failed to create workflow: ${reason}`);
  }
}

export interface CreateWorkflowCommand {
  readonly name: string;
  readonly description?: string;
  readonly branchStrategy: string;
  readonly workDefinitions: WorkDefinition[];
  readonly gitRefs: GitRef[];
  readonly mcpServerRefs?: McpServerRef[];
  readonly seedKeys?: string[];
}

export interface CreateWorkflowResult {
  readonly workflowId: string;
  readonly name: string;
}

@Injectable()
export class CreateWorkflowUseCase {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly gitReferenceChecker: GitReferenceChecker,
    private readonly mcpServerReferenceChecker: McpServerReferenceChecker,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateWorkflowCommand): Promise<CreateWorkflowResult> {
    await this.validateGitReferences(command.gitRefs);
    await this.validateMcpServerReferences(command.mcpServerRefs ?? []);

    const branchStrategy = BranchStrategy.create(command.branchStrategy);

    let workflow: Workflow;
    try {
      workflow = Workflow.create({
        name: command.name,
        description: command.description,
        branchStrategy,
        gitRefs: command.gitRefs,
        mcpServerRefs: command.mcpServerRefs,
        seedKeys: command.seedKeys,
        workDefinitions: command.workDefinitions,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new WorkflowCreationError(message);
    }

    await this.workflowRepository.save(workflow);

    const events = workflow.clearDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }

    return {
      workflowId: workflow.id,
      name: workflow.name,
    };
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
