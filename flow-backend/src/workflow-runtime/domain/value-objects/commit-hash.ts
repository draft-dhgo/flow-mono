import type { Brand } from '@common/ids/index.js';
import { RuntimeInvariantViolationError } from '../errors/index.js';

export type CommitHash = Brand<string, 'CommitHash'>;

const COMMIT_HASH_REGEX = /^[0-9a-f]{40}$/;

export const CommitHash = {
  create(value: string): CommitHash {
    const normalized = value.trim().toLowerCase();
    if (!COMMIT_HASH_REGEX.test(normalized)) {
      throw new RuntimeInvariantViolationError('CommitHash', `Invalid commit hash: "${value}"`);
    }
    return normalized as CommitHash;
  },
  isValid(value: unknown): value is CommitHash {
    return typeof value === 'string' && COMMIT_HASH_REGEX.test(value.trim().toLowerCase());
  },
};
