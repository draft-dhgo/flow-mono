import { Injectable } from '@nestjs/common';
import { GitWorkflowRefStore } from '../../domain/ports/git-workflow-ref-store.js';
import type { WorkflowDeleted } from '@common/events/index.js';

@Injectable()
export class WorkflowDeletedHandler {
  constructor(private readonly gitWorkflowRefStore: GitWorkflowRefStore) {}

  async handle(event: WorkflowDeleted): Promise<void> {
    await this.gitWorkflowRefStore.removeAllByWorkflowId(event.payload.workflowId);
  }
}
