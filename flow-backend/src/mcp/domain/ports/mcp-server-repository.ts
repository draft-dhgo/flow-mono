import type { McpServer } from '../entities/mcp-server.js';
import type { McpServerId } from '../value-objects/index.js';

export abstract class McpServerRepository {
  abstract findById(id: McpServerId): Promise<McpServer | null>;
  abstract findAll(): Promise<McpServer[]>;
  abstract findByIds(ids: McpServerId[]): Promise<McpServer[]>;
  abstract save(mcpServer: McpServer): Promise<void>;
  abstract delete(id: McpServerId): Promise<void>;
  abstract exists(id: McpServerId): Promise<boolean>;
}
