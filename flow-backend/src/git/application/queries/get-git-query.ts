import { Injectable, Inject } from '@nestjs/common';
import { GitRepository } from '../../domain/ports/git-repository.js';
import type { GitReadModel } from './read-models.js';
import type { GitId } from '@common/ids/index.js';
import { ApplicationError } from '@common/errors/index.js';

@Injectable()
export class GetGitQuery {
  constructor(
    @Inject(GitRepository) private readonly gitRepository: GitRepository,
  ) {}

  async execute(params: { gitId: GitId }): Promise<GitReadModel> {
    const git = await this.gitRepository.findById(params.gitId);
    if (!git) {
      throw new ApplicationError('GIT_NOT_FOUND', `Git not found: ${params.gitId}`);
    }
    return {
      id: git.id,
      url: git.url as string,
      localPath: git.localPath,
    };
  }
}
