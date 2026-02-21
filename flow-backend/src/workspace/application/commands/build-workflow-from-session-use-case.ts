import { Injectable, Inject } from '@nestjs/common';
import { WorkspaceId } from '@common/ids/index.js';
import { WorkflowFacade } from '@common/ports/index.js';
import type { WorkDefinitionInput, TaskDefinitionInput } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';
import { WorkspaceRepository } from '../../domain/ports/workspace-repository.js';
import { WorkspaceEntityNotFoundError } from '../../domain/errors/index.js';
import { WorkspacePurpose } from '../../domain/value-objects/workspace-purpose.js';
import { ParseWorkflowPreviewQuery } from '../queries/parse-workflow-preview-query.js';
import type { WorkflowPreview, WorkDefinitionPreview, TaskDefinitionPreview } from '../queries/parse-workflow-preview-query.js';

export class WorkflowPreviewNotFoundError extends ApplicationError {
  constructor() {
    super(
      'WORKFLOW_PREVIEW_NOT_FOUND',
      '워크플로우 정의를 찾을 수 없습니다. 에이전트에게 워크플로우 정의를 요청하세요.',
    );
  }
}

export class InvalidWorkspacePurposeError extends ApplicationError {
  constructor() {
    super('INVALID_WORKSPACE_PURPOSE', '워크플로우 빌더 세션이 아닙니다.');
  }
}

@Injectable()
export class BuildWorkflowFromSessionUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly parseWorkflowPreviewQuery: ParseWorkflowPreviewQuery,
    @Inject(WorkflowFacade) private readonly workflowFacade: WorkflowFacade,
  ) {}

  async execute(workspaceId: string): Promise<{ workflowId: string }> {
    const wsId = WorkspaceId.create(workspaceId);
    const workspace = await this.workspaceRepository.findById(wsId);
    if (!workspace) {
      throw new WorkspaceEntityNotFoundError('Workspace', workspaceId);
    }
    if (workspace.purpose !== WorkspacePurpose.WORKFLOW_BUILDER) {
      throw new InvalidWorkspacePurposeError();
    }

    const preview = this.parseWorkflowPreviewQuery.execute(workspaceId);
    if (!preview) {
      throw new WorkflowPreviewNotFoundError();
    }

    const result = await this.workflowFacade.create({
      name: preview.name,
      description: preview.description,
      branchStrategy: preview.branchStrategy,
      gitRefs: preview.gitRefs,
      mcpServerRefs: preview.mcpServerRefs,
      seedKeys: preview.seedKeys,
      workDefinitions: this.toWorkDefinitionInputs(preview),
    });

    return { workflowId: result.workflowId };
  }

  private toWorkDefinitionInputs(preview: WorkflowPreview): WorkDefinitionInput[] {
    return preview.workDefinitions.map((wd: WorkDefinitionPreview) => ({
      order: wd.order,
      model: wd.model,
      pauseAfter: wd.pauseAfter,
      reportFileRefs: wd.reportFileRefs,
      taskDefinitions: wd.taskDefinitions.map((td: TaskDefinitionPreview): TaskDefinitionInput => ({
        order: td.order,
        query: td.query,
        reportOutline: td.reportOutline ?? undefined,
      })),
    }));
  }
}
