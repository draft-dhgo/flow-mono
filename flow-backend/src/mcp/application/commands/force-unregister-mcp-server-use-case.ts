import { Injectable } from '@nestjs/common';
import { McpServerRepository } from '../../domain/index.js';
import type { McpServerId } from '../../domain/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';

export class ForceUnregisterMcpServerNotFoundError extends ApplicationError {
  constructor(mcpServerId: string) {
    super('MCP_SERVER_NOT_FOUND', `MCP server not found: ${mcpServerId}`);
  }
}

export interface ForceUnregisterMcpServerCommand {
  readonly mcpServerId: McpServerId;
}

@Injectable()
export class ForceUnregisterMcpServerUseCase {
  constructor(
    private readonly mcpServerRepository: McpServerRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: ForceUnregisterMcpServerCommand): Promise<void> {
    const mcpServer = await this.mcpServerRepository.findById(command.mcpServerId);
    if (!mcpServer) {
      throw new ForceUnregisterMcpServerNotFoundError(command.mcpServerId);
    }

    mcpServer.unregister();

    await this.mcpServerRepository.delete(command.mcpServerId);

    const events = mcpServer.clearDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }
  }
}
