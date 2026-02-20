import type { McpServerId, WorkflowId } from '@common/ids/index.js';
import { McpWorkflowRefStore } from '../domain/ports/mcp-workflow-ref-store.js';

export class InMemoryMcpWorkflowRefStore extends McpWorkflowRefStore {
  /** mcpServerId -> Set<workflowId> */
  private readonly mcpToWorkflows = new Map<string, Set<string>>();
  /** workflowId -> Set<mcpServerId> (reverse index for removeAllByWorkflowId) */
  private readonly workflowToMcps = new Map<string, Set<string>>();

  async addReference(mcpServerId: McpServerId, workflowId: WorkflowId): Promise<void> {
    if (!this.mcpToWorkflows.has(mcpServerId)) {
      this.mcpToWorkflows.set(mcpServerId, new Set());
    }
    this.mcpToWorkflows.get(mcpServerId)!.add(workflowId);

    if (!this.workflowToMcps.has(workflowId)) {
      this.workflowToMcps.set(workflowId, new Set());
    }
    this.workflowToMcps.get(workflowId)!.add(mcpServerId);
  }

  async removeReference(mcpServerId: McpServerId, workflowId: WorkflowId): Promise<void> {
    const workflowIds = this.mcpToWorkflows.get(mcpServerId);
    if (workflowIds) {
      workflowIds.delete(workflowId);
      if (workflowIds.size === 0) {
        this.mcpToWorkflows.delete(mcpServerId);
      }
    }

    const mcpIds = this.workflowToMcps.get(workflowId);
    if (mcpIds) {
      mcpIds.delete(mcpServerId);
      if (mcpIds.size === 0) {
        this.workflowToMcps.delete(workflowId);
      }
    }
  }

  async removeAllByWorkflowId(workflowId: WorkflowId): Promise<void> {
    const mcpIds = this.workflowToMcps.get(workflowId);
    if (mcpIds) {
      for (const mcpId of mcpIds) {
        const workflowIds = this.mcpToWorkflows.get(mcpId);
        if (workflowIds) {
          workflowIds.delete(workflowId);
          if (workflowIds.size === 0) {
            this.mcpToWorkflows.delete(mcpId);
          }
        }
      }
      this.workflowToMcps.delete(workflowId);
    }
  }

  async findWorkflowIdsByMcpServerId(mcpServerId: McpServerId): Promise<WorkflowId[]> {
    const workflowIds = this.mcpToWorkflows.get(mcpServerId);
    if (!workflowIds) {
      return [];
    }
    return [...workflowIds] as WorkflowId[];
  }
}
