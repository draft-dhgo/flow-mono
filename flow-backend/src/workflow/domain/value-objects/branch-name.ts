import type { Brand } from '@common/ids/index.js';
import { WorkflowInvariantViolationError } from '../errors/index.js';

export type BranchName = Brand<string, 'BranchName'>;

const INVALID_BRANCH_PATTERNS = [
  /\.\./,
  /\/\//,
  /^\//,
  /\/$/,
  /\.$/,
  /\.lock$/,
  /^@\{/,
  // eslint-disable-next-line no-control-regex
  /[\x00-\x1f\x7f ~^:?*[\\]/,
];

export const BranchName = {
  create(value: string): BranchName {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new WorkflowInvariantViolationError('Branch name cannot be empty');
    }
    for (const pattern of INVALID_BRANCH_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new WorkflowInvariantViolationError(`Invalid branch name: "${trimmed}"`);
      }
    }
    return trimmed as BranchName;
  },
  isValid(value: unknown): value is BranchName {
    if (typeof value !== 'string' || !value.trim()) return false;
    return !INVALID_BRANCH_PATTERNS.some((p) => p.test(value.trim()));
  },
};
