import type { Brand } from '@common/ids/index.js';
import { WorkflowInvariantViolationError } from '../errors/index.js';

export type IssueKey = Brand<string, 'IssueKey'>;

const DEFAULT_ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;

export const IssueKey = {
  create(value: string, pattern: RegExp = DEFAULT_ISSUE_KEY_PATTERN): IssueKey {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new WorkflowInvariantViolationError('Issue key cannot be empty');
    }
    if (!pattern.test(trimmed)) {
      throw new WorkflowInvariantViolationError(`Invalid issue key format: "${trimmed}"`);
    }
    return trimmed as IssueKey;
  },
  isValid(value: unknown, pattern: RegExp = DEFAULT_ISSUE_KEY_PATTERN): value is IssueKey {
    return typeof value === 'string' && pattern.test(value.trim());
  },
};
