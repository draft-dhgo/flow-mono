import { McpServerReader } from '@common/ports/index.js';
import type { McpServerInfo } from '@common/ports/index.js';
import type { McpServerId } from '@common/ids/index.js';
import type { McpServerRepository } from '../domain/ports/mcp-server-repository.js';

export class McpServerReaderImpl extends McpServerReader {
  constructor(private readonly mcpServerRepository: McpServerRepository) {
    super();
  }

  async findByIds(ids: McpServerId[]): Promise<McpServerInfo[]> {
    const servers = await this.mcpServerRepository.findByIds(ids);
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
}
