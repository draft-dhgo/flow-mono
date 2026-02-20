import { BaseDomainEvent } from './domain-event.js';
import type { GitId } from '../ids/index.js';

interface GitCreatedPayload {
  gitId: GitId;
  url: string;
  localPath: string;
}

export class GitCreated extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'git.created';
  readonly payload: Readonly<GitCreatedPayload>;

  constructor(payload: GitCreatedPayload, correlationId?: string) {
    super(GitCreated.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}

interface GitDeletedPayload {
  gitId: GitId;
}

export class GitDeleted extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'git.deleted';
  readonly payload: Readonly<GitDeletedPayload>;

  constructor(payload: GitDeletedPayload, correlationId?: string) {
    super(GitDeleted.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}
