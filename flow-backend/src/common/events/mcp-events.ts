import { BaseDomainEvent } from './domain-event.js';
import type { McpServerId } from '../ids/index.js';

interface McpServerRegisteredPayload {
  mcpServerId: McpServerId;
  name: string;
  transportType: string;
}

export class McpServerRegistered extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'mcp-server.registered';
  readonly payload: Readonly<McpServerRegisteredPayload>;

  constructor(payload: McpServerRegisteredPayload, correlationId?: string) {
    super(McpServerRegistered.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface McpServerUnregisteredPayload {
  mcpServerId: McpServerId;
}

export class McpServerUnregistered extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'mcp-server.unregistered';
  readonly payload: Readonly<McpServerUnregisteredPayload>;

  constructor(payload: McpServerUnregisteredPayload, correlationId?: string) {
    super(McpServerUnregistered.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}
