import { Injectable, Inject } from '@nestjs/common';
import type { McpServerFacade, RegisterMcpServerParams, RegisterMcpServerResult } from '@common/ports/index.js';
import { McpServerId } from '@common/ids/index.js';
import { McpServerRepository } from '../domain/ports/mcp-server-repository.js';
import { McpTransportType } from '../domain/value-objects/mcp-transport-type.js';
import { RegisterMcpServerUseCase } from './commands/register-mcp-server-use-case.js';
import { UnregisterMcpServerUseCase } from './commands/unregister-mcp-server-use-case.js';

@Injectable()
export class McpServerFacadeImpl implements McpServerFacade {
  constructor(
    @Inject(McpServerRepository) private readonly mcpServerRepository: McpServerRepository,
    private readonly registerUseCase: RegisterMcpServerUseCase,
    private readonly unregisterUseCase: UnregisterMcpServerUseCase,
  ) {}

  async list(): Promise<ReadonlyArray<Record<string, unknown>>> {
    const servers = await this.mcpServerRepository.findAll();
    return servers.map((s) => ({
      id: s.id,
      name: s.name,
      command: s.command,
      args: s.args,
      env: s.env,
      transportType: s.transportType,
      url: s.url,
    }));
  }

  async getById(mcpServerId: string): Promise<Record<string, unknown> | null> {
    const s = await this.mcpServerRepository.findById(McpServerId.create(mcpServerId));
    if (!s) return null;
    return {
      id: s.id,
      name: s.name,
      command: s.command,
      args: s.args,
      env: s.env,
      transportType: s.transportType,
      url: s.url,
    };
  }

  async register(params: RegisterMcpServerParams): Promise<RegisterMcpServerResult> {
    const result = await this.registerUseCase.execute({
      name: params.name,
      command: params.command,
      args: params.args,
      env: params.env,
      transportType: params.transportType as McpTransportType,
      url: params.url,
    });
    return {
      mcpServerId: result.mcpServerId,
      name: result.name,
      transportType: result.transportType,
    };
  }

  async delete(mcpServerId: string): Promise<void> {
    await this.unregisterUseCase.execute({ mcpServerId: McpServerId.create(mcpServerId) });
  }
}
