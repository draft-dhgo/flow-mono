import { createIdFactory } from '@common/ids/index.js';
import type { Brand } from '@common/ids/index.js';

export type AgentSessionId = Brand<string, 'AgentSessionId'>;
export const AgentSessionId = createIdFactory<AgentSessionId>('AgentSessionId');
