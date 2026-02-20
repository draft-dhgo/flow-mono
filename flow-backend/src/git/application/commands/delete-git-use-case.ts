import { Injectable } from '@nestjs/common';
import { GitRepository, GitClient } from '../../domain/index.js';
import type { GitId } from '../../domain/index.js';
import { GitWorkflowRefStore } from '../../domain/ports/git-workflow-ref-store.js';
import { GitReferencedByWorkflowError } from '../../domain/errors/git-referenced-by-workflow-error.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';
import { GitRepoPathFactory } from '../factories/git-repo-path-factory.js';

export class GitNotFoundError extends ApplicationError {
  constructor(gitId: string) {
    super('GIT_NOT_FOUND', `Git repository not found: ${gitId}`);
  }
}

export class GitDeleteError extends ApplicationError {
  constructor(gitId: string, cause?: Error) {
    super('GIT_DELETE_ERROR', `Failed to delete Git repository: ${gitId}`);
    this.cause = cause;
  }
}

export interface DeleteGitCommand {
  readonly gitId: GitId;
}

@Injectable()
export class DeleteGitUseCase {
  constructor(
    private readonly gitRepository: GitRepository,
    private readonly gitClient: GitClient,
    private readonly gitWorkflowRefStore: GitWorkflowRefStore,
    private readonly eventPublisher: EventPublisher,
    private readonly gitRepoPathFactory: GitRepoPathFactory,
  ) {}

  async execute(command: DeleteGitCommand): Promise<void> {
    const git = await this.gitRepository.findById(command.gitId);
    if (!git) {
      throw new GitNotFoundError(command.gitId);
    }

    // Check for active workflow references — prevent deletion if referenced
    const referencingWorkflowIds = await this.gitWorkflowRefStore.findWorkflowIdsByGitId(command.gitId);
    if (referencingWorkflowIds.length > 0) {
      throw new GitReferencedByWorkflowError(command.gitId, referencingWorkflowIds);
    }

    const absolutePath = this.gitRepoPathFactory.resolve(git.localPath);
    try {
      await this.gitClient.deleteRepo(absolutePath);
    } catch (error) {
      throw new GitDeleteError(command.gitId, error instanceof Error ? error : undefined);
    }

    git.delete();
    await this.gitRepository.delete(command.gitId);

    // Publish GitDeleted event — workflow domain handles git ref removal via event handler
    const events = git.clearDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }
  }
}
