import { Module, Inject, type OnModuleInit } from '@nestjs/common';
import { EventPublisher, WorkflowFacade } from '@common/ports/index.js';
import { CreateWorkflowUseCase } from '../application/commands/create-workflow-use-case.js';
import { UpdateWorkflowUseCase } from '../application/commands/update-workflow-use-case.js';
import { DeleteWorkflowUseCase } from '../application/commands/delete-workflow-use-case.js';
import { ActivateWorkflowUseCase } from '../application/commands/activate-workflow-use-case.js';
import { DeactivateWorkflowUseCase } from '../application/commands/deactivate-workflow-use-case.js';
import { ListWorkflowsQuery } from '../application/queries/list-workflows-query.js';
import { GetWorkflowQuery } from '../application/queries/get-workflow-query.js';
import { WorkflowFacadeImpl } from '../application/workflow-facade-impl.js';
import { GitDeletedHandler } from '../application/event-handlers/git-deleted-handler.js';
import { McpServerUnregisteredHandler } from '../application/event-handlers/mcp-server-unregistered-handler.js';
import { GitDeleted, McpServerUnregistered } from '@common/events/index.js';
import { WorkflowController } from './workflow.controller.js';
import { SharedModule } from '@common/presentation/shared.module.js';
import { WorkflowQueryModule } from '@common/presentation/workflow-query.module.js';
import { GitModule } from '@git/presentation/git.module.js';
import { McpModule } from '@mcp/presentation/mcp.module.js';

@Module({
  imports: [SharedModule, WorkflowQueryModule, GitModule, McpModule],
  providers: [
    // WorkflowRepository provided by WorkflowQueryModule
    // WorkflowRunActiveChecker provided by WorkflowQueryModule
    // GitReferenceChecker provided by GitModule
    // McpServerReferenceChecker provided by McpModule
    CreateWorkflowUseCase,
    UpdateWorkflowUseCase,
    DeleteWorkflowUseCase,
    ActivateWorkflowUseCase,
    DeactivateWorkflowUseCase,
    ListWorkflowsQuery,
    GetWorkflowQuery,
    { provide: WorkflowFacade, useClass: WorkflowFacadeImpl },
    GitDeletedHandler,
    McpServerUnregisteredHandler,
  ],
  controllers: [WorkflowController],
  exports: [
    CreateWorkflowUseCase,
    UpdateWorkflowUseCase,
    DeleteWorkflowUseCase,
    ActivateWorkflowUseCase,
    DeactivateWorkflowUseCase,
    ListWorkflowsQuery,
    GetWorkflowQuery,
    WorkflowFacade,
  ],
})
export class WorkflowModule implements OnModuleInit {
  constructor(
    @Inject(EventPublisher) private readonly eventPublisher: EventPublisher,
    private readonly gitDeletedHandler: GitDeletedHandler,
    private readonly mcpServerUnregisteredHandler: McpServerUnregisteredHandler,
  ) {}

  onModuleInit(): void {
    this.eventPublisher.subscribe(
      GitDeleted.EVENT_TYPE,
      (event) => this.gitDeletedHandler.handle(event as GitDeleted),
    );
    this.eventPublisher.subscribe(
      McpServerUnregistered.EVENT_TYPE,
      (event) => this.mcpServerUnregisteredHandler.handle(event as McpServerUnregistered),
    );
  }
}
