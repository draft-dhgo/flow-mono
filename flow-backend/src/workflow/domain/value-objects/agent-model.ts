import type { Brand } from '@common/ids/index.js';
import { WorkflowInvariantViolationError } from '../errors/index.js';

export type AgentModel = Brand<string, 'AgentModel'>;

const DEFAULT_ALLOWED_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-5-20250929',
  'claude-haiku-4-5-20251001',
];

export const AgentModel = {
  create(value: string, allowedModels: string[] = DEFAULT_ALLOWED_MODELS): AgentModel {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new WorkflowInvariantViolationError('Agent model cannot be empty');
    }
    if (!allowedModels.includes(trimmed)) {
      throw new WorkflowInvariantViolationError(
        `Invalid agent model: "${trimmed}". Allowed: ${allowedModels.join(', ')}`
      );
    }
    return trimmed as AgentModel;
  },
  isValid(value: unknown, allowedModels: string[] = DEFAULT_ALLOWED_MODELS): value is AgentModel {
    return typeof value === 'string' && allowedModels.includes(value.trim());
  },
};
