import { Injectable } from '@nestjs/common';
import { McpServerRepository } from '../../domain/index.js';
import type { McpServerId } from '../../domain/index.js';
import { McpWorkflowRefStore } from '../../domain/ports/mcp-workflow-ref-store.js';
import { McpServerReferencedByWorkflowError } from '../../domain/errors/mcp-server-referenced-by-workflow-error.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class McpServerNotFoundError extends ApplicationError {
  constructor(mcpServerId: string) {
    super('MCP_SERVER_NOT_FOUND', `MCP server not found: ${mcpServerId}`);
  }
}

export interface UnregisterMcpServerCommand {
  readonly mcpServerId: McpServerId;
}

@Injectable()
export class UnregisterMcpServerUseCase {
  constructor(
    private readonly mcpServerRepository: McpServerRepository,
    private readonly mcpWorkflowRefStore: McpWorkflowRefStore,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: UnregisterMcpServerCommand): Promise<void> {
    const mcpServer = await this.mcpServerRepository.findById(command.mcpServerId);
    if (!mcpServer) {
      throw new McpServerNotFoundError(command.mcpServerId);
    }

    // Check for active workflow references — prevent unregistration if referenced
    const referencingWorkflowIds = await this.mcpWorkflowRefStore.findWorkflowIdsByMcpServerId(command.mcpServerId);
    if (referencingWorkflowIds.length > 0) {
      throw new McpServerReferencedByWorkflowError(command.mcpServerId, referencingWorkflowIds);
    }

    mcpServer.unregister();

    await this.mcpServerRepository.delete(command.mcpServerId);

    // Publish McpServerUnregistered event — workflow domain handles ref removal via event handler
    const events = mcpServer.clearDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }
  }
}
