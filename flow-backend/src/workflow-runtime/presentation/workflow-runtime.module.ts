import { Module, Inject, Logger, type OnModuleInit } from '@nestjs/common';
import { EventPublisher, WorkflowPipelineService, WorkflowRuntimeFacade } from '@common/ports/index.js';
import type { WorkflowRunId } from '@common/ids/index.js';
import { WorkExecutionRepository } from '../domain/ports/work-execution-repository.js';
import { ReportRepository } from '../domain/ports/report-repository.js';
import { CheckpointRepository } from '../domain/ports/checkpoint-repository.js';
import { WorkTreeRepository } from '../domain/ports/work-tree-repository.js';
import { WorkflowSpaceRepository } from '../domain/ports/workflow-space-repository.js';
import { FileSystem } from '../domain/ports/file-system.js';
// infra
import { InMemoryWorkExecutionRepository } from '../infra/in-memory-work-execution-repository.js';
import { InMemoryReportRepository } from '../infra/in-memory-report-repository.js';
import { InMemoryCheckpointRepository } from '../infra/in-memory-checkpoint-repository.js';
import { InMemoryWorkTreeRepository } from '../infra/in-memory-work-tree-repository.js';
import { InMemoryWorkflowSpaceRepository } from '../infra/in-memory-workflow-space-repository.js';
import { NodeFileSystem } from '../infra/node-file-system.js';
import { WorkflowPipelineServiceImpl } from '../infra/workflow-pipeline-service-impl.js';
// application - commands
import { WorkflowRunFactory } from '../application/factories/workflow-run-factory.js';
import { WorkExecutionFactory } from '../application/factories/work-execution-factory.js';
import { WorkspacePathFactory } from '../application/factories/workspace-path-factory.js';
import { StartWorkflowRunUseCase } from '../application/commands/start-workflow-run-use-case.js';
import { StartNextWorkExecutionUseCase } from '../application/commands/start-next-work-execution-use-case.js';
import { SendQueryUseCase } from '../application/commands/send-query-use-case.js';
import { CompleteTaskExecutionUseCase } from '../application/commands/complete-task-execution-use-case.js';
import { PauseWorkflowRunUseCase } from '../application/commands/pause-workflow-run-use-case.js';
import { ResumeWorkflowRunUseCase } from '../application/commands/resume-workflow-run-use-case.js';
import { CancelWorkflowRunUseCase } from '../application/commands/cancel-workflow-run-use-case.js';
import { DeleteWorkflowRunUseCase } from '../application/commands/delete-workflow-run-use-case.js';
import { EditWorkNodeConfigUseCase } from '../application/commands/edit-work-node-config-use-case.js';
import { AddWorkNodeUseCase } from '../application/commands/add-work-node-use-case.js';
import { RemoveWorkNodeUseCase } from '../application/commands/remove-work-node-use-case.js';
import { RecoverOrphanedRunsUseCase } from '../application/commands/recover-orphaned-runs-use-case.js';
import { RestoreToCheckpointUseCase } from '../application/commands/restore-to-checkpoint-use-case.js';
import { WorkflowRuntimeFacadeImpl } from '../application/workflow-runtime-facade-impl.js';
// application - queries
import { ListWorkflowRunsQuery } from '../application/queries/list-workflow-runs-query.js';
import { GetWorkflowRunQuery } from '../application/queries/get-workflow-run-query.js';
import { GetWorkflowRunSummaryQuery } from '../application/queries/get-workflow-run-summary-query.js';
import { ListCheckpointsQuery } from '../application/queries/list-checkpoints-query.js';
import { GetReportQuery } from '../application/queries/get-report-query.js';
import { GetWorkspaceTreeQuery } from '../application/queries/get-workspace-tree-query.js';
import { GetWorkspaceFileQuery } from '../application/queries/get-workspace-file-query.js';
// event handlers
import { WorkflowDeletedHandler } from '../application/event-handlers/workflow-deleted-handler.js';
// events
import {
  WorkflowRunStarted,
  WorkflowRunResumed,
  WorkflowDeleted,
} from '@common/events/index.js';
import { WorkflowRuntimeController } from './workflow-runtime.controller.js';
import { ReportController } from './report.controller.js';
import { SharedModule } from '@common/presentation/shared.module.js';
import { WorkflowQueryModule } from '@common/presentation/workflow-query.module.js';
import { McpModule } from '@mcp/presentation/mcp.module.js';
import { GitModule } from '@git/presentation/git.module.js';
import { AgentModule } from '@agent/presentation/agent.module.js';

@Module({
  imports: [SharedModule, WorkflowQueryModule, McpModule, GitModule, AgentModule],
  providers: [
    // Repositories (WorkflowRunRepository provided by WorkflowQueryModule)
    { provide: WorkExecutionRepository, useClass: InMemoryWorkExecutionRepository },
    { provide: ReportRepository, useClass: InMemoryReportRepository },
    { provide: CheckpointRepository, useClass: InMemoryCheckpointRepository },
    { provide: WorkTreeRepository, useClass: InMemoryWorkTreeRepository },
    { provide: WorkflowSpaceRepository, useClass: InMemoryWorkflowSpaceRepository },
    { provide: FileSystem, useClass: NodeFileSystem },
    // AgentService provided by AgentModule
    // GitService provided by GitModule
    // WorkflowConfigReader provided by WorkflowQueryModule
    // WorkflowRunActiveChecker provided by WorkflowQueryModule
    // McpServerReader provided by McpModule
    // GitReader provided by GitModule
    // Pipeline service
    { provide: WorkflowPipelineService, useClass: WorkflowPipelineServiceImpl },
    // Factories
    WorkflowRunFactory,
    WorkExecutionFactory,
    {
      provide: WorkspacePathFactory,
      useFactory: () => new WorkspacePathFactory(),
    },
    // Commands
    StartWorkflowRunUseCase,
    StartNextWorkExecutionUseCase,
    SendQueryUseCase,
    CompleteTaskExecutionUseCase,
    PauseWorkflowRunUseCase,
    ResumeWorkflowRunUseCase,
    CancelWorkflowRunUseCase,
    DeleteWorkflowRunUseCase,
    EditWorkNodeConfigUseCase,
    AddWorkNodeUseCase,
    RemoveWorkNodeUseCase,
    RecoverOrphanedRunsUseCase,
    RestoreToCheckpointUseCase,
    // Queries
    ListWorkflowRunsQuery,
    GetWorkflowRunQuery,
    GetWorkflowRunSummaryQuery,
    ListCheckpointsQuery,
    GetReportQuery,
    GetWorkspaceTreeQuery,
    GetWorkspaceFileQuery,
    // Facade
    { provide: WorkflowRuntimeFacade, useClass: WorkflowRuntimeFacadeImpl },
    // Event handlers
    WorkflowDeletedHandler,
  ],
  controllers: [WorkflowRuntimeController, ReportController],
  exports: [
    StartWorkflowRunUseCase,
    PauseWorkflowRunUseCase,
    ResumeWorkflowRunUseCase,
    CancelWorkflowRunUseCase,
    DeleteWorkflowRunUseCase,
    CheckpointRepository,
    WorkflowRuntimeFacade,
  ],
})
export class WorkflowRuntimeModule implements OnModuleInit {
  private readonly logger = new Logger(WorkflowRuntimeModule.name);

  constructor(
    @Inject(EventPublisher) private readonly eventPublisher: EventPublisher,
    private readonly pipelineService: WorkflowPipelineService,
    private readonly workflowDeletedHandler: WorkflowDeletedHandler,
    private readonly recoverOrphanedRunsUseCase: RecoverOrphanedRunsUseCase,
  ) {}

  onModuleInit(): void {
    this.eventPublisher.subscribe(WorkflowRunStarted.EVENT_TYPE, async (event) => {
      void this.pipelineService.runPipeline(
        (event as WorkflowRunStarted).payload.workflowRunId as WorkflowRunId,
      );
    });
    this.eventPublisher.subscribe(WorkflowRunResumed.EVENT_TYPE, async (event) => {
      void this.pipelineService.runPipeline(
        (event as WorkflowRunResumed).payload.workflowRunId as WorkflowRunId,
      );
    });
    this.eventPublisher.subscribe(WorkflowDeleted.EVENT_TYPE, async (event) => {
      await this.workflowDeletedHandler.handle(event as WorkflowDeleted);
    });

    void this.recoverOrphanedRunsUseCase.execute().catch((err: unknown) => {
      this.logger.error('Failed to recover orphaned runs:', err);
    });
  }
}
