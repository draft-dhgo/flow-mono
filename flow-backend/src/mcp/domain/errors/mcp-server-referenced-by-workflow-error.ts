import { DomainError } from '@common/errors/index.js';
import type { McpServerId, WorkflowId } from '@common/ids/index.js';

export class McpServerReferencedByWorkflowError extends DomainError {
  constructor(mcpServerId: McpServerId, workflowIds: WorkflowId[]) {
    super(
      'MCP_SERVER_REFERENCED_BY_WORKFLOW',
      `MCP server ${mcpServerId} is referenced by workflows: [${workflowIds.join(', ')}]. Remove workflow references before unregistering.`,
    );
  }
}
