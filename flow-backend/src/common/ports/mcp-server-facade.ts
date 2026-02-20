export interface RegisterMcpServerParams {
  readonly name: string;
  readonly command: string;
  readonly args?: string[];
  readonly env?: Record<string, string>;
  readonly transportType: string;
  readonly url?: string;
}

export interface RegisterMcpServerResult {
  readonly mcpServerId: string;
  readonly name: string;
  readonly transportType: string;
}

/**
 * Facade for MCP server operations — used by mcp-gateway to avoid cross-domain imports.
 */
export abstract class McpServerFacade {
  abstract list(): Promise<ReadonlyArray<Record<string, unknown>>>;
  abstract getById(mcpServerId: string): Promise<Record<string, unknown> | null>;
  abstract register(params: RegisterMcpServerParams): Promise<RegisterMcpServerResult>;
  abstract delete(mcpServerId: string): Promise<void>;
}
