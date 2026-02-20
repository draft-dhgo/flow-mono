import { Injectable, Inject } from '@nestjs/common';
import type { GitFacade, RegisterGitParams, RegisterGitResult } from '@common/ports/index.js';
import { GitId } from '@common/ids/index.js';
import { GitRepository } from '../domain/ports/git-repository.js';
import { CreateGitUseCase } from './commands/create-git-use-case.js';
import { DeleteGitUseCase } from './commands/delete-git-use-case.js';

@Injectable()
export class GitFacadeImpl implements GitFacade {
  constructor(
    @Inject(GitRepository) private readonly gitRepository: GitRepository,
    private readonly createUseCase: CreateGitUseCase,
    private readonly deleteUseCase: DeleteGitUseCase,
  ) {}

  async list(): Promise<ReadonlyArray<Record<string, unknown>>> {
    const gits = await this.gitRepository.findAll();
    return gits.map((g) => ({
      id: g.id,
      url: g.url,
      localPath: g.localPath,
    }));
  }

  async getById(gitId: string): Promise<Record<string, unknown> | null> {
    const git = await this.gitRepository.findById(GitId.create(gitId));
    if (!git) return null;
    return { id: git.id, url: git.url, localPath: git.localPath };
  }

  async register(params: RegisterGitParams): Promise<RegisterGitResult> {
    return this.createUseCase.execute({ url: params.url, localPath: params.localPath });
  }

  async delete(gitId: string): Promise<void> {
    await this.deleteUseCase.execute({ gitId: GitId.create(gitId) });
  }
}
