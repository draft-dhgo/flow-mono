import type { Brand } from '@common/ids/index.js';
import { GitInvariantViolationError } from '../errors/index.js';

const GIT_URL_PATTERNS = [
  /^https?:\/\/.+\.git$/,
  /^git:\/\/.+\.git$/,
  /^ssh:\/\/.+\.git$/,
  /^git@.+:.+\.git$/,
  /^https?:\/\/.+/,
  /^git@.+:.+/,
];

export type GitUrl = Brand<string, 'GitUrl'>;

export const GitUrl = {
  create(value: string): GitUrl {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new GitInvariantViolationError('Git URL cannot be empty');
    }
    const isValid = GIT_URL_PATTERNS.some((pattern) => pattern.test(trimmed));
    if (!isValid) {
      throw new GitInvariantViolationError(`Invalid Git URL format: "${trimmed}"`);
    }
    return trimmed as GitUrl;
  },
  isValid(value: unknown): value is GitUrl {
    if (typeof value !== 'string') return false;
    return GIT_URL_PATTERNS.some((pattern) => pattern.test(value.trim()));
  },
};
