import { describe, it, expect } from 'vitest';
import { Git } from '@git/domain/entities/git.js';
import { GitUrl } from '@git/domain/value-objects/git-url.js';

describe('Git', () => {
  it('creates with correct properties', () => {
    const url = GitUrl.create('https://github.com/user/repo.git');
    const git = Git.create({ url, localPath: '/tmp/repo' });
    expect(git.url).toBe(url);
    expect(git.localPath).toBe('/tmp/repo');
  });

  it('emits GitCreated on create', () => {
    const url = GitUrl.create('https://github.com/user/repo.git');
    const git = Git.create({ url, localPath: '/tmp/repo' });
    const events = git.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('git.created');
  });

  it('delete works without guard (no activeWorkflowIds)', () => {
    const url = GitUrl.create('https://github.com/user/repo.git');
    const git = Git.create({ url, localPath: '/tmp/repo' });
    git.clearDomainEvents();
    git.delete();
    const events = git.clearDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('git.deleted');
  });

  it('throws on empty localPath', () => {
    const url = GitUrl.create('https://github.com/user/repo.git');
    expect(() => Git.create({ url, localPath: '' })).toThrow();
  });

  it('throws on blank localPath', () => {
    const url = GitUrl.create('https://github.com/user/repo.git');
    expect(() => Git.create({ url, localPath: '   ' })).toThrow();
  });
});
