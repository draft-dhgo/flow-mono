import type { McpServerId } from '../ids/index.js';

export interface McpServerRefInfo {
  readonly id: McpServerId;
}

export abstract class McpServerReferenceChecker {
  abstract findByIds(ids: McpServerId[]): Promise<McpServerRefInfo[]>;
}
