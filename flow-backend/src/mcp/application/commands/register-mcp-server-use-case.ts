import { Injectable } from '@nestjs/common';
import { McpServer } from '../../domain/index.js';
import { McpServerRepository } from '../../domain/index.js';
import { McpTransportType } from '../../domain/index.js';
import { EventPublisher } from '@common/ports/index.js';

export interface RegisterMcpServerCommand {
  readonly name: string;
  readonly command: string;
  readonly args?: string[];
  readonly env?: Record<string, string>;
  readonly transportType: McpTransportType;
  readonly url?: string | null;
}

export interface RegisterMcpServerResult {
  readonly mcpServerId: string;
  readonly name: string;
  readonly transportType: McpTransportType;
}

@Injectable()
export class RegisterMcpServerUseCase {
  constructor(
    private readonly mcpServerRepository: McpServerRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: RegisterMcpServerCommand): Promise<RegisterMcpServerResult> {
    const mcpServer = McpServer.create({
      name: command.name,
      command: command.command,
      args: command.args,
      env: command.env,
      transportType: command.transportType,
      url: command.url,
    });

    await this.mcpServerRepository.save(mcpServer);

    const events = mcpServer.clearDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }

    return {
      mcpServerId: mcpServer.id,
      name: mcpServer.name,
      transportType: mcpServer.transportType,
    };
  }
}
