import { Module } from '@nestjs/common';
import { FileSystem } from '@common/ports/file-system.js';
import { NodeFileSystem } from '@workflow-runtime/infra/node-file-system.js';
import { SharedModule } from '@common/presentation/shared.module.js';
import { GitModule } from '@git/presentation/git.module.js';
import { McpModule } from '@mcp/presentation/mcp.module.js';
import { AgentModule } from '@agent/presentation/agent.module.js';
import { WorkflowRuntimeModule } from '@workflow-runtime/presentation/workflow-runtime.module.js';
import { WorkflowModule } from '@workflow/presentation/workflow.module.js';
import { WorkspaceRepository } from '../domain/ports/workspace-repository.js';
import { InMemoryWorkspaceRepository } from '../infra/in-memory-workspace-repository.js';
import { WorkspaceChatHistory } from '../domain/ports/workspace-chat-history.js';
import { InMemoryWorkspaceChatHistory } from '../infra/in-memory-workspace-chat-history.js';
import { AdhocWorkspacePathFactory } from '../application/factories/workspace-path-factory.js';
import { CreateWorkspaceUseCase } from '../application/commands/create-workspace-use-case.js';
import { DeleteWorkspaceUseCase } from '../application/commands/delete-workspace-use-case.js';
import { CompleteWorkspaceUseCase } from '../application/commands/complete-workspace-use-case.js';
import { SendChatMessageUseCase } from '../application/commands/send-chat-message-use-case.js';
import { PushWorkspaceBranchesUseCase } from '../application/commands/push-workspace-branches-use-case.js';
import { MergeBranchesUseCase } from '../application/commands/merge-branches-use-case.js';
import { BuildWorkflowFromSessionUseCase } from '../application/commands/build-workflow-from-session-use-case.js';
import { GetWorkspaceQuery } from '../application/queries/get-workspace-query.js';
import { ListWorkspacesQuery } from '../application/queries/list-workspaces-query.js';
import { AdhocGetWorkspaceTreeQuery } from '../application/queries/get-workspace-tree-query.js';
import { AdhocGetWorkspaceFileQuery } from '../application/queries/get-workspace-file-query.js';
import { GetWorkspaceDiffQuery } from '../application/queries/get-workspace-diff-query.js';
import { ParseWorkflowPreviewQuery } from '../application/queries/parse-workflow-preview-query.js';
import { WorkspaceController } from './workspace.controller.js';

@Module({
  imports: [SharedModule, GitModule, McpModule, AgentModule, WorkflowRuntimeModule, WorkflowModule],
  controllers: [WorkspaceController],
  providers: [
    { provide: WorkspaceRepository, useClass: InMemoryWorkspaceRepository },
    { provide: FileSystem, useClass: NodeFileSystem },
    { provide: WorkspaceChatHistory, useClass: InMemoryWorkspaceChatHistory },
    AdhocWorkspacePathFactory,
    CreateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    CompleteWorkspaceUseCase,
    SendChatMessageUseCase,
    PushWorkspaceBranchesUseCase,
    MergeBranchesUseCase,
    BuildWorkflowFromSessionUseCase,
    GetWorkspaceQuery,
    ListWorkspacesQuery,
    AdhocGetWorkspaceTreeQuery,
    AdhocGetWorkspaceFileQuery,
    GetWorkspaceDiffQuery,
    ParseWorkflowPreviewQuery,
  ],
})
export class WorkspaceModule {}
