import { Module, Inject, type OnModuleInit } from '@nestjs/common';
import { McpServerRepository } from '../domain/ports/mcp-server-repository.js';
import { McpWorkflowRefStore } from '../domain/ports/mcp-workflow-ref-store.js';
import { EventPublisher, McpServerReferenceChecker, McpServerReader, McpServerFacade } from '@common/ports/index.js';
import { WorkflowMcpServerRefsUpdated, WorkflowDeleted } from '@common/events/index.js';
import { InMemoryMcpServerRepository } from '../infra/in-memory-mcp-server-repository.js';
import { InMemoryMcpWorkflowRefStore } from '../infra/in-memory-mcp-workflow-ref-store.js';
import { McpServerReferenceCheckerImpl } from '../infra/mcp-server-reference-checker-impl.js';
import { McpServerReaderImpl } from '../infra/mcp-server-reader-impl.js';
import { RegisterMcpServerUseCase } from '../application/commands/register-mcp-server-use-case.js';
import { UnregisterMcpServerUseCase } from '../application/commands/unregister-mcp-server-use-case.js';
import { ForceUnregisterMcpServerUseCase } from '../application/commands/force-unregister-mcp-server-use-case.js';
import { McpServerFacadeImpl } from '../application/mcp-server-facade-impl.js';
import { ListMcpServersQuery } from '../application/queries/list-mcp-servers-query.js';
import { GetMcpServerQuery } from '../application/queries/get-mcp-server-query.js';
import { WorkflowMcpServerRefsUpdatedHandler } from '../application/event-handlers/workflow-mcp-server-refs-updated-handler.js';
import { McpWorkflowDeletedHandler } from '../application/event-handlers/workflow-deleted-handler.js';
import { McpController } from './mcp.controller.js';
import { SharedModule } from '@common/presentation/shared.module.js';

@Module({
  imports: [SharedModule],
  providers: [
    { provide: McpServerRepository, useClass: InMemoryMcpServerRepository },
    { provide: McpWorkflowRefStore, useClass: InMemoryMcpWorkflowRefStore },
    {
      provide: McpServerReferenceChecker,
      useFactory: (repo: McpServerRepository) => new McpServerReferenceCheckerImpl(repo),
      inject: [McpServerRepository],
    },
    {
      provide: McpServerReader,
      useFactory: (repo: McpServerRepository) => new McpServerReaderImpl(repo),
      inject: [McpServerRepository],
    },
    RegisterMcpServerUseCase,
    UnregisterMcpServerUseCase,
    ForceUnregisterMcpServerUseCase,
    ListMcpServersQuery,
    GetMcpServerQuery,
    { provide: McpServerFacade, useClass: McpServerFacadeImpl },
    WorkflowMcpServerRefsUpdatedHandler,
    McpWorkflowDeletedHandler,
  ],
  controllers: [McpController],
  exports: [McpServerReferenceChecker, McpServerReader, McpServerRepository, RegisterMcpServerUseCase, UnregisterMcpServerUseCase, ListMcpServersQuery, GetMcpServerQuery, McpServerFacade],
})
export class McpModule implements OnModuleInit {
  constructor(
    @Inject(EventPublisher) private readonly eventPublisher: EventPublisher,
    private readonly workflowMcpServerRefsUpdatedHandler: WorkflowMcpServerRefsUpdatedHandler,
    private readonly mcpWorkflowDeletedHandler: McpWorkflowDeletedHandler,
  ) {}

  onModuleInit(): void {
    this.eventPublisher.subscribe(
      WorkflowMcpServerRefsUpdated.EVENT_TYPE,
      (event) => this.workflowMcpServerRefsUpdatedHandler.handle(event as WorkflowMcpServerRefsUpdated),
    );
    this.eventPublisher.subscribe(
      WorkflowDeleted.EVENT_TYPE,
      (event) => this.mcpWorkflowDeletedHandler.handle(event as WorkflowDeleted),
    );
  }
}
