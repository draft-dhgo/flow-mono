import type { McpServerId } from '../ids/index.js';
import type { McpServerConfig } from './agent-service.js';

export interface McpServerInfo {
  readonly id: McpServerId;
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly transportType: string;
  readonly url: string | null;
}

export abstract class McpServerReader {
  abstract findByIds(ids: McpServerId[]): Promise<McpServerInfo[]>;
}

export type { McpServerConfig };
