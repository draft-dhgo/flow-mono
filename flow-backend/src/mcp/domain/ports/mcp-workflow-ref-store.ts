import type { McpServerId, WorkflowId } from '@common/ids/index.js';

export abstract class McpWorkflowRefStore {
  abstract addReference(mcpServerId: McpServerId, workflowId: WorkflowId): Promise<void>;
  abstract removeReference(mcpServerId: McpServerId, workflowId: WorkflowId): Promise<void>;
  abstract removeAllByWorkflowId(workflowId: WorkflowId): Promise<void>;
  abstract findWorkflowIdsByMcpServerId(mcpServerId: McpServerId): Promise<WorkflowId[]>;
}
