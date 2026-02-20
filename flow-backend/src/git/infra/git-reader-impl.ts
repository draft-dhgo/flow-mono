import { GitReader } from '@common/ports/index.js';
import type { GitInfo } from '@common/ports/index.js';
import type { GitId } from '@common/ids/index.js';
import type { GitRepository } from '../domain/ports/git-repository.js';
import { GitRepoPathFactory } from '../application/factories/git-repo-path-factory.js';

export class GitReaderImpl extends GitReader {
  constructor(
    private readonly gitRepository: GitRepository,
    private readonly gitRepoPathFactory: GitRepoPathFactory,
  ) {
    super();
  }

  async findByIds(ids: GitId[]): Promise<GitInfo[]> {
    const gits = await this.gitRepository.findByIds(ids);
    return gits.map((g) => ({
      id: g.id,
      url: g.url as string,
      localPath: this.gitRepoPathFactory.resolve(g.localPath),
    }));
  }
}
