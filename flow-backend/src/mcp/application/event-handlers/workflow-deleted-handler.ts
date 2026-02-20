import { Injectable } from '@nestjs/common';
import { McpWorkflowRefStore } from '../../domain/ports/mcp-workflow-ref-store.js';
import type { WorkflowDeleted } from '@common/events/index.js';

@Injectable()
export class McpWorkflowDeletedHandler {
  constructor(private readonly mcpWorkflowRefStore: McpWorkflowRefStore) {}

  async handle(event: WorkflowDeleted): Promise<void> {
    await this.mcpWorkflowRefStore.removeAllByWorkflowId(event.payload.workflowId);
  }
}
