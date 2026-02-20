import { Injectable } from '@nestjs/common';
import type {
  WorkflowFacade,
  CreateWorkflowParams,
  CreateWorkflowResult,
  UpdateWorkflowParams,
  WorkDefinitionInput,
} from '@common/ports/index.js';
import { WorkflowId, GitId, McpServerId } from '@common/ids/index.js';
import { Section } from '@common/value-objects/index.js';
import { WorkflowRepository } from '../domain/index.js';
import type { Workflow } from '../domain/index.js';
import { GitRef, McpServerRef, WorkDefinition, TaskDefinition, AgentModel, ReportOutline } from '../domain/index.js';
import { CreateWorkflowUseCase } from './commands/create-workflow-use-case.js';
import { UpdateWorkflowUseCase } from './commands/update-workflow-use-case.js';
import { DeleteWorkflowUseCase } from './commands/delete-workflow-use-case.js';
import { ActivateWorkflowUseCase } from './commands/activate-workflow-use-case.js';
import { DeactivateWorkflowUseCase } from './commands/deactivate-workflow-use-case.js';

@Injectable()
export class WorkflowFacadeImpl implements WorkflowFacade {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly createUseCase: CreateWorkflowUseCase,
    private readonly updateUseCase: UpdateWorkflowUseCase,
    private readonly deleteUseCase: DeleteWorkflowUseCase,
    private readonly activateUseCase: ActivateWorkflowUseCase,
    private readonly deactivateUseCase: DeactivateWorkflowUseCase,
  ) {}

  async list(): Promise<ReadonlyArray<Record<string, unknown>>> {
    const workflows = await this.workflowRepository.findAll();
    return workflows.map((w) => this.serialize(w));
  }

  async getById(workflowId: string): Promise<Record<string, unknown> | null> {
    const workflow = await this.workflowRepository.findById(WorkflowId.create(workflowId));
    if (!workflow) return null;
    return this.serialize(workflow);
  }

  async create(params: CreateWorkflowParams): Promise<CreateWorkflowResult> {
    return this.createUseCase.execute({
      name: params.name,
      description: params.description,
      branchStrategy: params.branchStrategy,
      workDefinitions: params.workDefinitions.map((wd) => this.toWorkDefinition(wd)),
      gitRefs: params.gitRefs.map((r) => GitRef.create(GitId.create(r.gitId), r.baseBranch)),
      mcpServerRefs: params.mcpServerRefs?.map((r) =>
        McpServerRef.create(McpServerId.create(r.mcpServerId), r.envOverrides),
      ),
    });
  }

  async update(params: UpdateWorkflowParams): Promise<void> {
    await this.updateUseCase.execute({
      workflowId: WorkflowId.create(params.workflowId),
      name: params.name,
      description: params.description,
      workDefinitions: params.workDefinitions?.map((wd) => this.toWorkDefinition(wd)),
      gitRefs: params.gitRefs?.map((r) => GitRef.create(GitId.create(r.gitId), r.baseBranch)),
      mcpServerRefs: params.mcpServerRefs?.map((r) =>
        McpServerRef.create(McpServerId.create(r.mcpServerId), r.envOverrides),
      ),
    });
  }

  async delete(workflowId: string): Promise<void> {
    await this.deleteUseCase.execute({ workflowId: WorkflowId.create(workflowId) });
  }

  async activate(workflowId: string): Promise<void> {
    await this.activateUseCase.execute({ workflowId: WorkflowId.create(workflowId) });
  }

  async deactivate(workflowId: string): Promise<void> {
    await this.deactivateUseCase.execute({ workflowId: WorkflowId.create(workflowId) });
  }

  private toWorkDefinition(wd: WorkDefinitionInput): WorkDefinition {
    const taskDefs = wd.taskDefinitions.map((td) => {
      const reportOutline = td.reportOutline
        ? ReportOutline.create(td.reportOutline.sections.map((s) => Section.create(s.title, s.description)))
        : undefined;
      return TaskDefinition.create(td.order, td.query, reportOutline);
    });
    return WorkDefinition.create(
      wd.order,
      AgentModel.create(wd.model),
      taskDefs,
      wd.gitRefs?.map((r) => GitRef.create(GitId.create(r.gitId), r.baseBranch)),
      wd.mcpServerRefs?.map((r) => McpServerRef.create(McpServerId.create(r.mcpServerId), r.envOverrides)),
      wd.pauseAfter,
    );
  }

  private serialize(workflow: Workflow): Record<string, unknown> {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      branchStrategy: workflow.branchStrategy.workBranch as string,
      status: workflow.status,
      gitRefCount: workflow.gitRefs.length,
      mcpServerRefCount: workflow.mcpServerRefs.length,
      workDefinitionCount: workflow.workDefinitions.length,
      gitRefs: workflow.gitRefs.map((r) => ({ gitId: r.gitId, baseBranch: r.baseBranch as string, valid: r.valid })),
      mcpServerRefs: workflow.mcpServerRefs.map((r) => ({ mcpServerId: r.mcpServerId, envOverrides: r.envOverrides, valid: r.valid })),
      workDefinitions: workflow.workDefinitions.map((wd) => ({
        order: wd.order,
        model: wd.model as string,
        pauseAfter: wd.pauseAfter,
        taskDefinitions: wd.taskDefinitions.map((td) => ({
          order: td.order,
          query: td.query,
          reportOutline: td.reportOutline
            ? { sections: td.reportOutline.sections.map((s) => ({ title: s.title, description: s.description })) }
            : null,
        })),
        gitRefs: wd.gitRefs.map((r) => ({ gitId: r.gitId, baseBranch: r.baseBranch as string, valid: r.valid })),
        mcpServerRefs: wd.mcpServerRefs.map((r) => ({ mcpServerId: r.mcpServerId, envOverrides: r.envOverrides, valid: r.valid })),
      })),
    };
  }
}
