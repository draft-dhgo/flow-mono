import { WorkflowConfigReader } from '@common/ports/index.js';
import type {
  WorkflowConfig,
  WorkDefinitionConfig,
  TaskDefinitionConfig,
  McpServerRefConfig,
  GitRefConfig,
} from '@common/ports/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import type { WorkflowRepository } from '../domain/ports/workflow-repository.js';

export class WorkflowConfigReaderImpl extends WorkflowConfigReader {
  constructor(private readonly workflowRepository: WorkflowRepository) {
    super();
  }

  async findById(workflowId: WorkflowId): Promise<WorkflowConfig | null> {
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) return null;

    const config: WorkflowConfig = {
      id: workflow.id,
      name: workflow.name,
      status: workflow.status,
      branchStrategy: workflow.branchStrategy.workBranch as string,
      gitRefs: workflow.gitRefs.map(
        (ref): GitRefConfig => ({
          gitId: ref.gitId,
          baseBranch: ref.baseBranch,
        }),
      ),
      mcpServerRefs: workflow.mcpServerRefs.map(
        (ref): McpServerRefConfig => ({
          mcpServerId: ref.mcpServerId,
          envOverrides: { ...ref.envOverrides },
        }),
      ),
      seedKeys: [...workflow.seedKeys],
      workDefinitions: workflow.workDefinitions.map(
        (wd): WorkDefinitionConfig => ({
          order: wd.order,
          model: wd.model,
          pauseAfter: wd.pauseAfter,
          taskDefinitions: wd.taskDefinitions.map(
            (td): TaskDefinitionConfig => ({
              order: td.order,
              query: td.query,
              reportOutline: td.reportOutline
                ? {
                    sections: td.reportOutline.sections.map((s) => ({
                      title: s.title,
                      description: s.description,
                    })),
                  }
                : undefined,
            }),
          ),
          mcpServerRefs: wd.mcpServerRefs.map(
            (ref): McpServerRefConfig => ({
              mcpServerId: ref.mcpServerId,
              envOverrides: { ...ref.envOverrides },
            }),
          ),
          gitRefs: wd.gitRefs.map(
            (ref): GitRefConfig => ({
              gitId: ref.gitId,
              baseBranch: ref.baseBranch,
            }),
          ),
        }),
      ),
    };
    return config;
  }
}
