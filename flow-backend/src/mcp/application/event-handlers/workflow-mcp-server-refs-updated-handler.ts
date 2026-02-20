import { Injectable } from '@nestjs/common';
import { McpWorkflowRefStore } from '../../domain/ports/mcp-workflow-ref-store.js';
import type { WorkflowMcpServerRefsUpdated } from '@common/events/index.js';

@Injectable()
export class WorkflowMcpServerRefsUpdatedHandler {
  constructor(private readonly mcpWorkflowRefStore: McpWorkflowRefStore) {}

  async handle(event: WorkflowMcpServerRefsUpdated): Promise<void> {
    for (const mcpServerId of event.payload.addedMcpServerIds) {
      await this.mcpWorkflowRefStore.addReference(mcpServerId, event.payload.workflowId);
    }
    for (const mcpServerId of event.payload.removedMcpServerIds) {
      await this.mcpWorkflowRefStore.removeReference(mcpServerId, event.payload.workflowId);
    }
  }
}
