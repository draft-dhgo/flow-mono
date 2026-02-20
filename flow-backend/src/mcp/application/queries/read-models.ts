import type { McpServerId } from '@common/ids/index.js';
import type { McpTransportType } from '../../domain/value-objects/index.js';

export interface McpServerReadModel {
  readonly id: McpServerId;
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly transportType: McpTransportType;
  readonly url: string | null;
}
