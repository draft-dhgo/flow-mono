import { Controller, Get, Post, Req, Res, Query, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { McpServerFactory } from '../application/mcp-server-factory.js';
import { McpSessionManager } from '../application/mcp-session-manager.js';

@Controller('mcp')
export class McpGatewayController {
  private readonly logger = new Logger(McpGatewayController.name);

  constructor(
    private readonly mcpServerFactory: McpServerFactory,
    private readonly sessionManager: McpSessionManager,
  ) {}

  @Get('sse')
  async handleSse(@Req() req: Request, @Res() res: Response): Promise<void> {
    this.logger.log('New MCP SSE connection request');

    const transport = new SSEServerTransport('/mcp/messages', res);
    const sessionId = transport.sessionId;

    this.sessionManager.register(sessionId, transport);

    req.on('close', () => {
      this.logger.log(`MCP SSE connection closed: ${sessionId}`);
      this.sessionManager.remove(sessionId);
      void transport.close();
    });

    const server = this.mcpServerFactory.create();
    await server.connect(transport);

    this.logger.log(`MCP SSE session established: ${sessionId}`);
  }

  @Post('messages')
  async handleMessage(
    @Req() req: Request,
    @Res() res: Response,
    @Query('sessionId') sessionId: string,
  ): Promise<void> {
    const transport = this.sessionManager.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: `MCP session not found: ${sessionId}` });
      return;
    }

    await transport.handlePostMessage(req, res, req.body);
  }
}
