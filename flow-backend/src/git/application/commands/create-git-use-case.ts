import { Injectable } from '@nestjs/common';
import { Git } from '../../domain/index.js';
import { GitRepository, GitClient } from '../../domain/index.js';
import { GitUrl } from '../../domain/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';
import { GitRepoPathFactory } from '../factories/git-repo-path-factory.js';

export class GitDuplicateUrlError extends ApplicationError {
  constructor(url: string) {
    super('GIT_DUPLICATE_URL', `Git repository with URL already exists: ${url}`);
  }
}

export class GitCloneError extends ApplicationError {
  constructor(url: string, cause?: Error) {
    super('GIT_CLONE_ERROR', `Failed to clone Git repository: ${url}`);
    this.cause = cause;
  }
}

export interface CreateGitCommand {
  readonly url: string;
  readonly localPath: string;
}

export interface CreateGitResult {
  readonly gitId: string;
  readonly url: string;
  readonly localPath: string;
}

@Injectable()
export class CreateGitUseCase {
  constructor(
    private readonly gitRepository: GitRepository,
    private readonly gitClient: GitClient,
    private readonly eventPublisher: EventPublisher,
    private readonly gitRepoPathFactory: GitRepoPathFactory,
  ) {}

  async execute(command: CreateGitCommand): Promise<CreateGitResult> {
    const gitUrl = GitUrl.create(command.url);

    const existing = await this.gitRepository.findByUrl(gitUrl);
    if (existing) {
      throw new GitDuplicateUrlError(command.url);
    }

    const absolutePath = this.gitRepoPathFactory.resolve(command.localPath);

    try {
      await this.gitClient.clone({ url: gitUrl, localPath: absolutePath });
    } catch (error) {
      throw new GitCloneError(command.url, error instanceof Error ? error : undefined);
    }

    const git = Git.create({
      url: gitUrl,
      localPath: command.localPath,
    });

    await this.gitRepository.save(git);

    const events = git.clearDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }

    return {
      gitId: git.id,
      url: gitUrl,
      localPath: git.localPath,
    };
  }
}
