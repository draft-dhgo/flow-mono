import { describe, it, expect, vi } from 'vitest';
import { ListMcpServersQuery } from '@mcp/application/queries/list-mcp-servers-query.js';
import { McpServer } from '@mcp/domain/entities/mcp-server.js';
import { McpTransportType } from '@mcp/domain/value-objects/index.js';
import type { McpServerRepository } from '@mcp/domain/ports/mcp-server-repository.js';
import type { McpServerId } from '@common/ids/index.js';

function createMocks() {
  const mcpServerRepository: McpServerRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByIds: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  return { mcpServerRepository };
}

const MCP_ID_1 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as McpServerId;
const MCP_ID_2 = 'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff' as McpServerId;

function makeMcpServer(id: McpServerId, name: string): McpServer {
  return McpServer.fromProps({
    id,
    name,
    command: 'npx',
    args: [],
    env: {},
    transportType: McpTransportType.STDIO,
    url: null,
  });
}

describe('ListMcpServersQuery', () => {
  it('returns list of mcp server read models', async () => {
    const mocks = createMocks();
    const servers = [
      makeMcpServer(MCP_ID_1, 'Server A'),
      makeMcpServer(MCP_ID_2, 'Server B'),
    ];
    vi.mocked(mocks.mcpServerRepository.findAll).mockResolvedValue(servers);

    const query = new ListMcpServersQuery(mocks.mcpServerRepository);
    const result = await query.execute();

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe(MCP_ID_1);
    expect(result[0]!.name).toBe('Server A');
    expect(result[1]!.id).toBe(MCP_ID_2);
    expect(result[1]!.name).toBe('Server B');
    expect(mocks.mcpServerRepository.findAll).toHaveBeenCalledOnce();
  });

  it('returns empty array when no servers exist', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.mcpServerRepository.findAll).mockResolvedValue([]);

    const query = new ListMcpServersQuery(mocks.mcpServerRepository);
    const result = await query.execute();

    expect(result).toEqual([]);
  });
});
