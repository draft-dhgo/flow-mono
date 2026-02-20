import { GitReferenceChecker } from '@common/ports/index.js';
import type { GitRefInfo } from '@common/ports/index.js';
import type { GitId } from '@common/ids/index.js';
import type { GitRepository } from '../domain/ports/git-repository.js';

export class GitReferenceCheckerImpl extends GitReferenceChecker {
  constructor(private readonly gitRepository: GitRepository) {
    super();
  }

  async findByIds(ids: GitId[]): Promise<GitRefInfo[]> {
    const gits = await this.gitRepository.findByIds(ids);
    return gits.map((g) => ({ id: g.id }));
  }
}
