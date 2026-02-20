import { Injectable, Logger } from '@nestjs/common';
import type { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

@Injectable()
export class McpSessionManager {
  private readonly logger = new Logger(McpSessionManager.name);
  private readonly transports = new Map<string, SSEServerTransport>();

  register(sessionId: string, transport: SSEServerTransport): void {
    this.transports.set(sessionId, transport);
    this.logger.log(`SSE session registered: ${sessionId}`);
  }

  get(sessionId: string): SSEServerTransport | undefined {
    return this.transports.get(sessionId);
  }

  remove(sessionId: string): void {
    this.transports.delete(sessionId);
    this.logger.log(`SSE session removed: ${sessionId}`);
  }

  get activeSessionCount(): number {
    return this.transports.size;
  }
}
