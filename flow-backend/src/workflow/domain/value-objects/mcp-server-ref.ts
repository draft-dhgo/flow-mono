import type { McpServerId } from '@common/ids/index.js';

export class McpServerRef {
  private readonly _mcpServerId: McpServerId;
  private readonly _envOverrides: Readonly<Record<string, string>>;
  private readonly _valid: boolean;

  private constructor(mcpServerId: McpServerId, envOverrides: Record<string, string>, valid: boolean) {
    this._mcpServerId = mcpServerId;
    this._envOverrides = Object.freeze({ ...envOverrides });
    this._valid = valid;
  }

  static create(mcpServerId: McpServerId, envOverrides?: Record<string, string>): McpServerRef {
    return new McpServerRef(mcpServerId, envOverrides ?? {}, true);
  }

  static fromProps(mcpServerId: McpServerId, envOverrides: Record<string, string>, valid: boolean = true): McpServerRef {
    return new McpServerRef(mcpServerId, envOverrides, valid);
  }

  static invalidate(ref: McpServerRef): McpServerRef {
    return new McpServerRef(ref._mcpServerId, { ...ref._envOverrides }, false);
  }

  get mcpServerId(): McpServerId {
    return this._mcpServerId;
  }

  get envOverrides(): Readonly<Record<string, string>> {
    return this._envOverrides;
  }

  get valid(): boolean {
    return this._valid;
  }
}
