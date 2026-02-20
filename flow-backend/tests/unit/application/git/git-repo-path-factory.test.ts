import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { GitRepoPathFactory } from '@git/application/factories/git-repo-path-factory.js';

describe('GitRepoPathFactory', () => {
  it('resolves a relative path against the base path', () => {
    const factory = new GitRepoPathFactory('/repos');
    expect(factory.resolve('my-project')).toBe(join('/repos', 'my-project'));
  });

  it('returns absolute paths as-is', () => {
    const factory = new GitRepoPathFactory('/repos');
    expect(factory.resolve('/absolute/path/to/repo')).toBe('/absolute/path/to/repo');
  });

  it('resolves nested relative paths', () => {
    const factory = new GitRepoPathFactory('/repos');
    expect(factory.resolve('org/my-project')).toBe(join('/repos', 'org', 'my-project'));
  });

  it('returns the configured base path via getBasePath', () => {
    const factory = new GitRepoPathFactory('/custom/base');
    expect(factory.getBasePath()).toBe('/custom/base');
  });

  it('handles base path with trailing separator', () => {
    const factory = new GitRepoPathFactory('/repos/');
    expect(factory.resolve('my-project')).toBe(join('/repos/', 'my-project'));
  });

  it('handles relative path with dot prefix', () => {
    const factory = new GitRepoPathFactory('/repos');
    const resolved = factory.resolve('./my-project');
    expect(resolved).toBe(join('/repos', './my-project'));
  });

  it('handles relative path with parent directory reference', () => {
    const factory = new GitRepoPathFactory('/repos/sub');
    const resolved = factory.resolve('../my-project');
    expect(resolved).toBe(join('/repos/sub', '../my-project'));
  });

  it('resolves empty relative path to base path', () => {
    const factory = new GitRepoPathFactory('/repos');
    expect(factory.resolve('')).toBe('/repos');
  });
});
