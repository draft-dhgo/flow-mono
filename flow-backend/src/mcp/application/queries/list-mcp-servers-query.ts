import { Injectable, Inject } from '@nestjs/common';
import { McpServerRepository } from '../../domain/ports/mcp-server-repository.js';
import type { McpServerReadModel } from './read-models.js';

@Injectable()
export class ListMcpServersQuery {
  constructor(
    @Inject(McpServerRepository) private readonly mcpServerRepository: McpServerRepository,
  ) {}

  async execute(): Promise<McpServerReadModel[]> {
    const servers = await this.mcpServerRepository.findAll();
    return servers.map((server) => ({
      id: server.id,
      name: server.name,
      command: server.command,
      args: server.args,
      env: server.env,
      transportType: server.transportType,
      url: server.url,
    }));
  }
}
