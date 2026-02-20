import type { McpServer } from '../domain/entities/mcp-server.js';
import type { McpServerId } from '../domain/value-objects/index.js';
import { McpServerRepository } from '../domain/ports/mcp-server-repository.js';

export class InMemoryMcpServerRepository extends McpServerRepository {
  private readonly store = new Map<McpServerId, McpServer>();

  async findById(id: McpServerId): Promise<McpServer | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<McpServer[]> {
    return [...this.store.values()];
  }

  async findByIds(ids: McpServerId[]): Promise<McpServer[]> {
    return ids.map((id) => this.store.get(id)).filter((s): s is McpServer => s !== undefined);
  }

  async save(mcpServer: McpServer): Promise<void> {
    this.store.set(mcpServer.id, mcpServer);
  }

  async delete(id: McpServerId): Promise<void> {
    this.store.delete(id);
  }

  async exists(id: McpServerId): Promise<boolean> {
    return this.store.has(id);
  }
}
