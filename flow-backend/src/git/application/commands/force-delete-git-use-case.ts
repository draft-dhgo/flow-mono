import { Injectable } from '@nestjs/common';
import { GitRepository, GitClient } from '../../domain/index.js';
import type { GitId } from '../../domain/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';
import { GitRepoPathFactory } from '../factories/git-repo-path-factory.js';

export class ForceDeleteGitNotFoundError extends ApplicationError {
  constructor(gitId: string) {
    super('GIT_NOT_FOUND', `Git repository not found: ${gitId}`);
  }
}

export class ForceDeleteGitError extends ApplicationError {
  constructor(gitId: string, cause?: Error) {
    super('GIT_FORCE_DELETE_ERROR', `Failed to force delete Git repository: ${gitId}`);
    this.cause = cause;
  }
}

export interface ForceDeleteGitCommand {
  readonly gitId: GitId;
}

@Injectable()
export class ForceDeleteGitUseCase {
  constructor(
    private readonly gitRepository: GitRepository,
    private readonly gitClient: GitClient,
    private readonly eventPublisher: EventPublisher,
    private readonly gitRepoPathFactory: GitRepoPathFactory,
  ) {}

  async execute(command: ForceDeleteGitCommand): Promise<void> {
    const git = await this.gitRepository.findById(command.gitId);
    if (!git) {
      throw new ForceDeleteGitNotFoundError(command.gitId);
    }

    const absolutePath = this.gitRepoPathFactory.resolve(git.localPath);
    try {
      await this.gitClient.deleteRepo(absolutePath);
    } catch (error) {
      throw new ForceDeleteGitError(command.gitId, error instanceof Error ? error : undefined);
    }

    git.delete();
    await this.gitRepository.delete(command.gitId);

    const events = git.clearDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }
  }
}
