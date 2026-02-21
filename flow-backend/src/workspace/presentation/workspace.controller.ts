import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateWorkspaceUseCase } from '../application/commands/create-workspace-use-case.js';
import { DeleteWorkspaceUseCase } from '../application/commands/delete-workspace-use-case.js';
import { CompleteWorkspaceUseCase } from '../application/commands/complete-workspace-use-case.js';
import { SendChatMessageUseCase } from '../application/commands/send-chat-message-use-case.js';
import { PushWorkspaceBranchesUseCase } from '../application/commands/push-workspace-branches-use-case.js';
import { MergeBranchesUseCase } from '../application/commands/merge-branches-use-case.js';
import { GetWorkspaceQuery } from '../application/queries/get-workspace-query.js';
import { ListWorkspacesQuery } from '../application/queries/list-workspaces-query.js';
import { AdhocGetWorkspaceTreeQuery } from '../application/queries/get-workspace-tree-query.js';
import { AdhocGetWorkspaceFileQuery } from '../application/queries/get-workspace-file-query.js';
import { GetWorkspaceDiffQuery } from '../application/queries/get-workspace-diff-query.js';
import { ParseWorkflowPreviewQuery } from '../application/queries/parse-workflow-preview-query.js';
import { BuildWorkflowFromSessionUseCase } from '../application/commands/build-workflow-from-session-use-case.js';
import { ListAgentLogsQuery } from '@agent/application/queries/list-agent-logs-query.js';
import { WorkspaceId } from '@common/ids/index.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { SendChatMessageDto } from './dto/send-chat-message.dto.js';
import { MergeBranchesDto } from './dto/merge-branches.dto.js';

@ApiTags('Workspaces')
@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private readonly createWorkspaceUseCase: CreateWorkspaceUseCase,
    private readonly getWorkspaceQuery: GetWorkspaceQuery,
    private readonly listWorkspacesQuery: ListWorkspacesQuery,
    private readonly deleteWorkspaceUseCase: DeleteWorkspaceUseCase,
    private readonly completeWorkspaceUseCase: CompleteWorkspaceUseCase,
    private readonly sendChatMessageUseCase: SendChatMessageUseCase,
    private readonly getWorkspaceTreeQuery: AdhocGetWorkspaceTreeQuery,
    private readonly getWorkspaceFileQuery: AdhocGetWorkspaceFileQuery,
    private readonly getWorkspaceDiffQuery: GetWorkspaceDiffQuery,
    private readonly listAgentLogsQuery: ListAgentLogsQuery,
    private readonly pushWorkspaceBranchesUseCase: PushWorkspaceBranchesUseCase,
    private readonly mergeBranchesUseCase: MergeBranchesUseCase,
    private readonly parseWorkflowPreviewQuery: ParseWorkflowPreviewQuery,
    private readonly buildWorkflowFromSessionUseCase: BuildWorkflowFromSessionUseCase,
  ) {}

  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created' })
  @Post()
  async create(@Body() dto: CreateWorkspaceDto) {
    return this.createWorkspaceUseCase.execute({
      name: dto.name,
      model: dto.model,
      gitRefs: dto.gitRefs,
      mcpServerRefs: (dto.mcpServerRefs ?? []).map((ref) => ({
        mcpServerId: ref.mcpServerId,
        envOverrides: ref.envOverrides ?? {},
      })),
      purpose: dto.purpose,
    });
  }

  @ApiOperation({ summary: 'List all workspaces' })
  @ApiResponse({ status: 200, description: 'List of workspaces' })
  @Get()
  async list() {
    return this.listWorkspacesQuery.execute();
  }

  @ApiOperation({ summary: 'Get workspace details' })
  @ApiResponse({ status: 200, description: 'Workspace details' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.getWorkspaceQuery.execute(id);
  }

  @ApiOperation({ summary: 'Delete a workspace' })
  @ApiResponse({ status: 200, description: 'Workspace deleted' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.deleteWorkspaceUseCase.execute(id);
  }

  @ApiOperation({ summary: 'Complete a workspace' })
  @ApiResponse({ status: 200, description: 'Workspace completed' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @Post(':id/complete')
  @HttpCode(200)
  async complete(@Param('id') id: string) {
    await this.completeWorkspaceUseCase.execute(id);
  }

  @ApiOperation({ summary: 'Send a chat message to the workspace agent' })
  @ApiResponse({ status: 200, description: 'Agent response' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @Post(':id/chat')
  @HttpCode(200)
  async chat(@Param('id') id: string, @Body() dto: SendChatMessageDto) {
    return this.sendChatMessageUseCase.execute({
      workspaceId: id,
      message: dto.message,
    });
  }

  @ApiOperation({ summary: 'Get workspace file tree' })
  @ApiResponse({ status: 200, description: 'File tree entries' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @Get(':id/tree')
  async tree(@Param('id') id: string) {
    return this.getWorkspaceTreeQuery.execute(id);
  }

  @ApiOperation({ summary: 'Read a file from the workspace' })
  @ApiResponse({ status: 200, description: 'File content' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @Get(':id/file')
  async file(@Param('id') id: string, @Query('path') filePath: string) {
    return this.getWorkspaceFileQuery.execute(id, filePath);
  }

  @ApiOperation({ summary: 'Get workspace diff against base branch' })
  @ApiResponse({ status: 200, description: 'Diff file info list' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @Get(':id/diff')
  async diff(@Param('id') id: string, @Query('gitId') gitId?: string) {
    return this.getWorkspaceDiffQuery.execute(id, gitId);
  }

  @ApiOperation({ summary: 'Merge branches from workflow runs into workspace' })
  @ApiResponse({ status: 200, description: 'Merge result' })
  @Post(':id/merge')
  @HttpCode(200)
  async mergeBranches(@Param('id') id: string, @Body() dto: MergeBranchesDto) {
    return this.mergeBranchesUseCase.execute({
      workspaceId: WorkspaceId.create(id),
      workflowRunIds: dto.workflowRunIds,
    });
  }

  @ApiOperation({ summary: 'Push workspace branches to remote' })
  @ApiResponse({ status: 200, description: 'Push results' })
  @Post(':id/push')
  @HttpCode(200)
  async pushBranches(@Param('id') id: string) {
    return this.pushWorkspaceBranchesUseCase.execute(WorkspaceId.create(id));
  }

  @ApiOperation({ summary: 'Get workflow preview from builder session' })
  @ApiResponse({ status: 200, description: 'Workflow preview or null' })
  @Get(':id/workflow-preview')
  async workflowPreview(@Param('id') id: string) {
    return this.parseWorkflowPreviewQuery.execute(id) ?? null;
  }

  @ApiOperation({ summary: 'Build workflow from builder session' })
  @ApiResponse({ status: 200, description: 'Created workflow' })
  @Post(':id/build-workflow')
  @HttpCode(200)
  async buildWorkflow(@Param('id') id: string) {
    return this.buildWorkflowFromSessionUseCase.execute(id);
  }

  @ApiOperation({ summary: 'Get agent logs for the workspace' })
  @ApiResponse({ status: 200, description: 'Agent log entries' })
  @Get(':id/agent-logs')
  async getAgentLogs(@Param('id') id: string) {
    return this.listAgentLogsQuery.execute({ workExecutionId: id });
  }
}
