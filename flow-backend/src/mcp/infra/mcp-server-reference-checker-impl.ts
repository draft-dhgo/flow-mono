import { McpServerReferenceChecker } from '@common/ports/index.js';
import type { McpServerRefInfo } from '@common/ports/index.js';
import type { McpServerId } from '@common/ids/index.js';
import type { McpServerRepository } from '../domain/ports/mcp-server-repository.js';

export class McpServerReferenceCheckerImpl extends McpServerReferenceChecker {
  constructor(private readonly mcpServerRepository: McpServerRepository) {
    super();
  }

  async findByIds(ids: McpServerId[]): Promise<McpServerRefInfo[]> {
    const servers = await this.mcpServerRepository.findByIds(ids);
    return servers.map((s) => ({ id: s.id }));
  }
}
