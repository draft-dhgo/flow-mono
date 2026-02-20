import { Injectable } from '@nestjs/common';
import type { WorkflowRunId, WorkExecutionId } from '../../domain/index.js';
import type { GitId } from '@common/ids/index.js';
import { tempBasePath, buildPath } from '@common/utils/index.js';

@Injectable()
export class WorkspacePathFactory {
  private readonly basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath ?? tempBasePath('WORKFLOW_SPACES_PATH', 'workflow-spaces');
  }

  workflowSpacePath(workflowRunId: WorkflowRunId): string {
    return buildPath(this.basePath, workflowRunId);
  }

  workTreePath(workflowRunId: WorkflowRunId, gitId: GitId): string {
    return buildPath(this.basePath, workflowRunId, 'work-trees', gitId);
  }

  workSpacePath(workflowRunId: WorkflowRunId, workExecutionId: WorkExecutionId): string {
    return buildPath(this.basePath, workflowRunId, 'workspaces', workExecutionId);
  }
}
