import { Injectable, Inject } from '@nestjs/common';
import { McpServerRepository } from '../../domain/ports/mcp-server-repository.js';
import { maskEnvValues, type McpServerReadModel } from './read-models.js';
import type { McpServerId } from '@common/ids/index.js';
import { ApplicationError } from '@common/errors/index.js';

@Injectable()
export class GetMcpServerQuery {
  constructor(
    @Inject(McpServerRepository) private readonly mcpServerRepository: McpServerRepository,
  ) {}

  async execute(params: { mcpServerId: McpServerId }): Promise<McpServerReadModel> {
    const server = await this.mcpServerRepository.findById(params.mcpServerId);
    if (!server) {
      throw new ApplicationError('MCP_SERVER_NOT_FOUND', `MCP server not found: ${params.mcpServerId}`);
    }
    return {
      id: server.id,
      name: server.name,
      command: server.command,
      args: server.args,
      env: maskEnvValues(server.env),
      transportType: server.transportType,
      url: server.url,
    };
  }
}
