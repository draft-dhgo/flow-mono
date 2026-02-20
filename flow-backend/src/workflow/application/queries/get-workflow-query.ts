import { Injectable, Inject } from '@nestjs/common';
import { WorkflowRepository } from '../../domain/ports/workflow-repository.js';
import type { Workflow } from '../../domain/entities/workflow.js';
import type { WorkflowReadModel } from './read-models.js';
import type { WorkflowId } from '@common/ids/index.js';
import { ApplicationError } from '@common/errors/index.js';

@Injectable()
export class GetWorkflowQuery {
  constructor(
    @Inject(WorkflowRepository) private readonly workflowRepository: WorkflowRepository,
  ) {}

  async execute(params: { workflowId: WorkflowId }): Promise<WorkflowReadModel> {
    const workflow = await this.workflowRepository.findById(params.workflowId);
    if (!workflow) {
      throw new ApplicationError('WORKFLOW_NOT_FOUND', `Workflow not found: ${params.workflowId}`);
    }
    return serializeWorkflow(workflow);
  }
}

function serializeWorkflow(workflow: Workflow): WorkflowReadModel {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    branchStrategy: workflow.branchStrategy.workBranch as string,
    status: workflow.status,
    gitRefCount: workflow.gitRefs.length,
    mcpServerRefCount: workflow.mcpServerRefs.length,
    workDefinitionCount: workflow.workDefinitions.length,
    seedKeys: [...workflow.seedKeys],
    gitRefs: workflow.gitRefs.map((r) => ({
      gitId: r.gitId as string,
      baseBranch: r.baseBranch as string,
      valid: r.valid,
    })),
    mcpServerRefs: workflow.mcpServerRefs.map((r) => ({
      mcpServerId: r.mcpServerId as string,
      envOverrides: r.envOverrides,
      valid: r.valid,
    })),
    workDefinitions: workflow.workDefinitions.map((wd) => ({
      order: wd.order,
      model: wd.model as string,
      pauseAfter: wd.pauseAfter,
      reportFileRefs: [...wd.reportFileRefs],
      taskDefinitions: wd.taskDefinitions.map((td) => ({
        order: td.order,
        query: td.query,
        reportOutline: td.reportOutline
          ? { sections: td.reportOutline.sections.map((s) => ({ title: s.title, description: s.description })) }
          : null,
      })),
      gitRefs: wd.gitRefs.map((r) => ({
        gitId: r.gitId as string,
        baseBranch: r.baseBranch as string,
        valid: r.valid,
      })),
      mcpServerRefs: wd.mcpServerRefs.map((r) => ({
        mcpServerId: r.mcpServerId as string,
        envOverrides: r.envOverrides,
        valid: r.valid,
      })),
    })),
  };
}
