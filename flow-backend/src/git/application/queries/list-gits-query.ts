import { Injectable, Inject } from '@nestjs/common';
import { GitRepository } from '../../domain/ports/git-repository.js';
import type { GitReadModel } from './read-models.js';

@Injectable()
export class ListGitsQuery {
  constructor(
    @Inject(GitRepository) private readonly gitRepository: GitRepository,
  ) {}

  async execute(): Promise<GitReadModel[]> {
    const gits = await this.gitRepository.findAll();
    return gits.map((git) => ({
      id: git.id,
      url: git.url as string,
      localPath: git.localPath,
    }));
  }
}
