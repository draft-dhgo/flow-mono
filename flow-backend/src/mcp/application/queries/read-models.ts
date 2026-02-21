import type { McpServerId } from '@common/ids/index.js';
import type { McpTransportType } from '../../domain/value-objects/index.js';

/** 환경변수 값을 마스킹한다. 앞 3글자만 표시 + **** */
export function maskEnvValues(env: Readonly<Record<string, string>>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    masked[key] = value.length > 3 ? value.substring(0, 3) + '****' : '****';
  }
  return masked;
}

export interface McpServerReadModel {
  readonly id: McpServerId;
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly transportType: McpTransportType;
  readonly url: string | null;
}
