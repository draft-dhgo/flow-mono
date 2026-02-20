import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpServerFacade } from '@common/ports/index.js';

@Injectable()
export class McpServerToolRegistrar {
  constructor(
    private readonly mcpServerFacade: McpServerFacade,
  ) {}

  register(server: McpServer): void {
    server.tool(
      'mcp_server_list',
      'List all registered MCP servers',
      {},
      async () => {
        const result = await this.mcpServerFacade.list();
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    server.tool(
      'mcp_server_get',
      'Get MCP server details by ID',
      { mcpServerId: z.string().describe('MCP server UUID') },
      async ({ mcpServerId }) => {
        try {
          const s = await this.mcpServerFacade.getById(mcpServerId);
          if (!s) {
            return { content: [{ type: 'text' as const, text: `MCP server not found: ${mcpServerId}` }], isError: true };
          }
          return { content: [{ type: 'text' as const, text: JSON.stringify(s, null, 2) }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'mcp_server_register',
      'Register a new MCP server',
      {
        name: z.string().describe('MCP server name'),
        command: z.string().describe('Command to start the MCP server'),
        args: z.array(z.string()).optional().describe('Command arguments'),
        env: z.record(z.string(), z.string()).optional().describe('Environment variables'),
        transportType: z.enum(['STDIO', 'SSE', 'STREAMABLE_HTTP']).describe('Transport type'),
        url: z.string().optional().describe('Server URL (required for SSE/STREAMABLE_HTTP)'),
      },
      async ({ name, command, args, env, transportType, url }) => {
        try {
          const result = await this.mcpServerFacade.register({
            name,
            command,
            args,
            env: env as Record<string, string> | undefined,
            transportType,
            url,
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'mcp_server_delete',
      'Delete an MCP server by ID',
      { mcpServerId: z.string().describe('MCP server UUID') },
      async ({ mcpServerId }) => {
        try {
          await this.mcpServerFacade.delete(mcpServerId);
          return { content: [{ type: 'text' as const, text: `MCP server deleted: ${mcpServerId}` }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );
  }
}
