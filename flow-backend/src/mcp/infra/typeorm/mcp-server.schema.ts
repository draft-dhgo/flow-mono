import { EntitySchema } from 'typeorm';

export interface McpServerRow {
  id: string;
  name: string;
  command: string;
  args: unknown;
  env: unknown;
  transport_type: string;
  url: string | null;
  version: number;
}

export const McpServerSchema = new EntitySchema<McpServerRow>({
  name: 'mcp_server',
  tableName: 'mcp_servers',
  columns: {
    id: { type: 'uuid', primary: true },
    name: { type: 'varchar', length: 255 },
    command: { type: 'varchar', length: 500 },
    args: { type: 'jsonb', default: '[]' },
    env: { type: 'jsonb', default: '{}' },
    transport_type: { type: 'varchar', length: 50 },
    url: { type: 'varchar', length: 500, nullable: true },
    version: { type: 'int', default: 0 },
  },
});
