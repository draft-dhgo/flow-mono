import { describe, it, expect, vi } from 'vitest';
import { GetMcpServerQuery } from '@mcp/application/queries/get-mcp-server-query.js';
import { McpServer } from '@mcp/domain/entities/mcp-server.js';
import { McpTransportType } from '@mcp/domain/value-objects/index.js';
import type { McpServerRepository } from '@mcp/domain/ports/mcp-server-repository.js';
import type { McpServerId } from '@common/ids/index.js';
import { ApplicationError } from '@common/errors/index.js';

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

const MCP_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as McpServerId;

function makeMcpServer(): McpServer {
  return McpServer.fromProps({
    id: MCP_ID,
    name: 'Test MCP',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/test'],
    env: { KEY: 'value' },
    transportType: McpTransportType.STDIO,
    url: null,
  });
}

describe('GetMcpServerQuery', () => {
  it('returns mcp server read model when found', async () => {
    const mocks = createMocks();
    const server = makeMcpServer();
    vi.mocked(mocks.mcpServerRepository.findById).mockResolvedValue(server);

    const query = new GetMcpServerQuery(mocks.mcpServerRepository);
    const result = await query.execute({ mcpServerId: MCP_ID });

    expect(result.id).toBe(MCP_ID);
    expect(result.name).toBe('Test MCP');
    expect(result.command).toBe('npx');
    expect(result.args).toEqual(['-y', '@modelcontextprotocol/test']);
    expect(result.env).toEqual({ KEY: 'value' });
    expect(result.transportType).toBe(McpTransportType.STDIO);
    expect(result.url).toBeNull();
    expect(mocks.mcpServerRepository.findById).toHaveBeenCalledWith(MCP_ID);
  });

  it('throws ApplicationError when mcp server not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.mcpServerRepository.findById).mockResolvedValue(null);

    const query = new GetMcpServerQuery(mocks.mcpServerRepository);

    await expect(query.execute({ mcpServerId: MCP_ID })).rejects.toThrow(ApplicationError);
    await expect(query.execute({ mcpServerId: MCP_ID })).rejects.toThrow(/not found/i);
  });
});
