import { describe, it, expect, vi } from 'vitest';
import { GetGitQuery } from '@git/application/queries/get-git-query.js';
import { Git, GitUrl } from '@git/domain/index.js';
import type { GitRepository } from '@git/domain/ports/git-repository.js';
import type { GitId } from '@common/ids/index.js';
import { ApplicationError } from '@common/errors/index.js';

function createMocks() {
  const gitRepository: GitRepository = {
    findById: vi.fn(),
    findByUrl: vi.fn(),
    findAll: vi.fn(),
    findByIds: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  return { gitRepository };
}

const GIT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as GitId;

function makeGit(): Git {
  return Git.fromProps({
    id: GIT_ID,
    url: GitUrl.create('https://github.com/user/repo.git'),
    localPath: 'user/repo',
  });
}

describe('GetGitQuery', () => {
  it('returns git read model when found', async () => {
    const mocks = createMocks();
    const git = makeGit();
    vi.mocked(mocks.gitRepository.findById).mockResolvedValue(git);

    const query = new GetGitQuery(mocks.gitRepository);
    const result = await query.execute({ gitId: GIT_ID });

    expect(result.id).toBe(GIT_ID);
    expect(result.url).toBe('https://github.com/user/repo.git');
    expect(result.localPath).toBe('user/repo');
    expect(mocks.gitRepository.findById).toHaveBeenCalledWith(GIT_ID);
  });

  it('throws ApplicationError when git not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.gitRepository.findById).mockResolvedValue(null);

    const query = new GetGitQuery(mocks.gitRepository);

    await expect(query.execute({ gitId: GIT_ID })).rejects.toThrow(ApplicationError);
    await expect(query.execute({ gitId: GIT_ID })).rejects.toThrow(/not found/i);
  });
});
