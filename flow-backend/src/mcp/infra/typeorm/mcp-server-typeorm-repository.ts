import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import { McpServerRepository } from '../../domain/ports/mcp-server-repository.js';
import { McpServer } from '../../domain/entities/mcp-server.js';
import type { McpServerRow } from './mcp-server.schema.js';
import { McpServerId } from '../../domain/value-objects/index.js';
import { McpTransportType } from '../../domain/value-objects/index.js';

export class McpServerTypeormRepository extends McpServerRepository {
  constructor(private readonly repo: Repository<McpServerRow>) {
    super();
  }

  private toDomain(row: McpServerRow): McpServer {
    return McpServer.fromProps({
      id: McpServerId.create(row.id),
      name: row.name,
      command: row.command,
      args: row.args as string[],
      env: row.env as Record<string, string>,
      transportType: row.transport_type as McpTransportType,
      url: row.url,
      version: row.version,
    });
  }

  private toRow(entity: McpServer): McpServerRow {
    return {
      id: entity.id as string,
      name: entity.name,
      command: entity.command,
      args: [...entity.args],
      env: { ...entity.env },
      transport_type: entity.transportType as string,
      url: entity.url,
      version: entity.version,
    };
  }

  async findById(id: McpServerId): Promise<McpServer | null> {
    const row = await this.repo.findOneBy({ id: id as string });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<McpServer[]> {
    const rows = await this.repo.find();
    return rows.map((row) => this.toDomain(row));
  }

  async findByIds(ids: McpServerId[]): Promise<McpServer[]> {
    if (ids.length === 0) return [];
    const rows = await this.repo.findBy({
      id: In(ids as string[]),
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(mcpServer: McpServer): Promise<void> {
    const row = this.toRow(mcpServer);
    await this.repo.save(row);
  }

  async delete(id: McpServerId): Promise<void> {
    await this.repo.delete({ id: id as string });
  }

  async exists(id: McpServerId): Promise<boolean> {
    const count = await this.repo.countBy({ id: id as string });
    return count > 0;
  }
}
