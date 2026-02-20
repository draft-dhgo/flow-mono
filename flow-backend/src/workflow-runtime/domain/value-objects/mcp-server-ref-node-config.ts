import type { McpServerId } from '@common/ids/index.js';

export interface McpServerRefNodeConfigProps {
  readonly mcpServerId: McpServerId;
  readonly envOverrides: Readonly<Record<string, string>>;
}

export class McpServerRefNodeConfig {
  private readonly _mcpServerId: McpServerId;
  private readonly _envOverrides: Readonly<Record<string, string>>;

  private constructor(mcpServerId: McpServerId, envOverrides: Record<string, string>) {
    this._mcpServerId = mcpServerId;
    this._envOverrides = Object.freeze({ ...envOverrides });
  }

  static create(mcpServerId: McpServerId, envOverrides?: Record<string, string>): McpServerRefNodeConfig {
    return new McpServerRefNodeConfig(mcpServerId, envOverrides ?? {});
  }

  static fromProps(props: McpServerRefNodeConfigProps): McpServerRefNodeConfig {
    return new McpServerRefNodeConfig(props.mcpServerId, { ...props.envOverrides });
  }

  get mcpServerId(): McpServerId { return this._mcpServerId; }
  get envOverrides(): Readonly<Record<string, string>> { return this._envOverrides; }
}
