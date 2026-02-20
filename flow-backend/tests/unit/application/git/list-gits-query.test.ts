import { describe, it, expect, vi } from 'vitest';
import { ListGitsQuery } from '@git/application/queries/list-gits-query.js';
import { Git, GitUrl } from '@git/domain/index.js';
import type { GitRepository } from '@git/domain/ports/git-repository.js';
import type { GitId } from '@common/ids/index.js';

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

const GIT_ID_1 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as GitId;
const GIT_ID_2 = 'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff' as GitId;

function makeGit(id: GitId, url: string, localPath: string): Git {
  return Git.fromProps({
    id,
    url: GitUrl.create(url),
    localPath,
  });
}

describe('ListGitsQuery', () => {
  it('returns list of git read models', async () => {
    const mocks = createMocks();
    const gits = [
      makeGit(GIT_ID_1, 'https://github.com/user/repo1.git', 'user/repo1'),
      makeGit(GIT_ID_2, 'https://github.com/user/repo2.git', 'user/repo2'),
    ];
    vi.mocked(mocks.gitRepository.findAll).mockResolvedValue(gits);

    const query = new ListGitsQuery(mocks.gitRepository);
    const result = await query.execute();

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe(GIT_ID_1);
    expect(result[0]!.url).toBe('https://github.com/user/repo1.git');
    expect(result[1]!.id).toBe(GIT_ID_2);
    expect(result[1]!.localPath).toBe('user/repo2');
    expect(mocks.gitRepository.findAll).toHaveBeenCalledOnce();
  });

  it('returns empty array when no gits exist', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.gitRepository.findAll).mockResolvedValue([]);

    const query = new ListGitsQuery(mocks.gitRepository);
    const result = await query.execute();

    expect(result).toEqual([]);
  });
});
