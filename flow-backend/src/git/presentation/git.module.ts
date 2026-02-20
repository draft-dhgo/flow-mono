import { Module, Inject, type OnModuleInit } from '@nestjs/common';
import { GitRepository } from '../domain/ports/git-repository.js';
import { GitClient } from '../domain/ports/git-client.js';
import { GitWorkflowRefStore } from '../domain/ports/git-workflow-ref-store.js';
import { EventPublisher, GitReferenceChecker, GitReader, GitService, GitFacade } from '@common/ports/index.js';
import { WorkflowGitRefsUpdated, WorkflowDeleted } from '@common/events/index.js';
import { InMemoryGitRepository } from '../infra/in-memory-git-repository.js';
import { InMemoryGitWorkflowRefStore } from '../infra/in-memory-git-workflow-ref-store.js';
import { GitReferenceCheckerImpl } from '../infra/git-reference-checker-impl.js';
import { GitReaderImpl } from '../infra/git-reader-impl.js';
import { CliGitClient } from '../infra/cli-git-client.js';
import { GitServiceImpl } from '../infra/git-service-impl.js';
import { CreateGitUseCase } from '../application/commands/create-git-use-case.js';
import { DeleteGitUseCase } from '../application/commands/delete-git-use-case.js';
import { ForceDeleteGitUseCase } from '../application/commands/force-delete-git-use-case.js';
import { GitFacadeImpl } from '../application/git-facade-impl.js';
import { ListGitsQuery } from '../application/queries/list-gits-query.js';
import { GetGitQuery } from '../application/queries/get-git-query.js';
import { GitRepoPathFactory } from '../application/factories/git-repo-path-factory.js';
import { WorkflowGitRefsUpdatedHandler } from '../application/event-handlers/workflow-git-refs-updated-handler.js';
import { WorkflowDeletedHandler } from '../application/event-handlers/workflow-deleted-handler.js';
import { GitController } from './git.controller.js';
import { SharedModule } from '@common/presentation/shared.module.js';
import { tempBasePath } from '@common/utils/index.js';

@Module({
  imports: [SharedModule],
  providers: [
    { provide: GitRepository, useClass: InMemoryGitRepository },
    { provide: GitClient, useClass: CliGitClient },
    { provide: GitWorkflowRefStore, useClass: InMemoryGitWorkflowRefStore },
    {
      provide: GitRepoPathFactory,
      useFactory: () => new GitRepoPathFactory(tempBasePath('GIT_REPOS_BASE_PATH', 'flowflow-repos')),
    },
    {
      provide: GitReferenceChecker,
      useFactory: (repo: GitRepository) => new GitReferenceCheckerImpl(repo),
      inject: [GitRepository],
    },
    {
      provide: GitReader,
      useFactory: (repo: GitRepository, pathFactory: GitRepoPathFactory) =>
        new GitReaderImpl(repo, pathFactory),
      inject: [GitRepository, GitRepoPathFactory],
    },
    {
      provide: GitService,
      useFactory: (client: GitClient) => new GitServiceImpl(client),
      inject: [GitClient],
    },
    CreateGitUseCase,
    DeleteGitUseCase,
    ForceDeleteGitUseCase,
    ListGitsQuery,
    GetGitQuery,
    { provide: GitFacade, useClass: GitFacadeImpl },
    WorkflowGitRefsUpdatedHandler,
    WorkflowDeletedHandler,
  ],
  controllers: [GitController],
  exports: [GitReferenceChecker, GitReader, GitService, GitRepository, CreateGitUseCase, DeleteGitUseCase, ListGitsQuery, GetGitQuery, GitFacade],
})
export class GitModule implements OnModuleInit {
  constructor(
    @Inject(EventPublisher) private readonly eventPublisher: EventPublisher,
    private readonly workflowGitRefsUpdatedHandler: WorkflowGitRefsUpdatedHandler,
    private readonly workflowDeletedHandler: WorkflowDeletedHandler,
  ) {}

  onModuleInit(): void {
    this.eventPublisher.subscribe(
      WorkflowGitRefsUpdated.EVENT_TYPE,
      (event) => this.workflowGitRefsUpdatedHandler.handle(event as WorkflowGitRefsUpdated),
    );
    this.eventPublisher.subscribe(
      WorkflowDeleted.EVENT_TYPE,
      (event) => this.workflowDeletedHandler.handle(event as WorkflowDeleted),
    );
  }
}
