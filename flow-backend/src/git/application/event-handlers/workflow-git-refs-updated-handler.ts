import { Injectable } from '@nestjs/common';
import { GitWorkflowRefStore } from '../../domain/ports/git-workflow-ref-store.js';
import type { WorkflowGitRefsUpdated } from '@common/events/index.js';

@Injectable()
export class WorkflowGitRefsUpdatedHandler {
  constructor(private readonly gitWorkflowRefStore: GitWorkflowRefStore) {}

  async handle(event: WorkflowGitRefsUpdated): Promise<void> {
    for (const gitId of event.payload.addedGitIds) {
      await this.gitWorkflowRefStore.addReference(gitId, event.payload.workflowId);
    }
    for (const gitId of event.payload.removedGitIds) {
      await this.gitWorkflowRefStore.removeReference(gitId, event.payload.workflowId);
    }
  }
}
