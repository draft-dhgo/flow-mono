import { Injectable, Inject } from '@nestjs/common';
import { WorkflowRepository } from '../../domain/ports/workflow-repository.js';
import type { Workflow } from '../../domain/entities/workflow.js';
import type { WorkflowReadModel } from './read-models.js';

@Injectable()
export class ListWorkflowsQuery {
  constructor(
    @Inject(WorkflowRepository) private readonly workflowRepository: WorkflowRepository,
  ) {}

  async execute(): Promise<WorkflowReadModel[]> {
    const workflows = await this.workflowRepository.findAll();
    return workflows.map((w) => serializeWorkflow(w));
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
