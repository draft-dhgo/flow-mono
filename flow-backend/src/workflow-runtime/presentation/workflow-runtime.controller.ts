import { Controller, Post, Put, Delete, Get, Body, Param, Query, ParseIntPipe, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StartWorkflowRunUseCase } from '../application/commands/start-workflow-run-use-case.js';
import { PauseWorkflowRunUseCase } from '../application/commands/pause-workflow-run-use-case.js';
import { ResumeWorkflowRunUseCase } from '../application/commands/resume-workflow-run-use-case.js';
import { CancelWorkflowRunUseCase } from '../application/commands/cancel-workflow-run-use-case.js';
import { DeleteWorkflowRunUseCase } from '../application/commands/delete-workflow-run-use-case.js';
import { RestoreToCheckpointUseCase } from '../application/commands/restore-to-checkpoint-use-case.js';
import { EditWorkNodeConfigUseCase } from '../application/commands/edit-work-node-config-use-case.js';
import { AddWorkNodeUseCase } from '../application/commands/add-work-node-use-case.js';
import { RemoveWorkNodeUseCase } from '../application/commands/remove-work-node-use-case.js';
import { PushBranchesUseCase } from '../application/commands/push-branches-use-case.js';
import { ListWorkflowRunsQuery } from '../application/queries/list-workflow-runs-query.js';
import { GetWorkflowRunQuery } from '../application/queries/get-workflow-run-query.js';
import { GetWorkflowRunSummaryQuery } from '../application/queries/get-workflow-run-summary-query.js';
import { ListCheckpointsQuery } from '../application/queries/list-checkpoints-query.js';
import { GetWorkspaceTreeQuery } from '../application/queries/get-workspace-tree-query.js';
import { GetWorkspaceFileQuery } from '../application/queries/get-workspace-file-query.js';
import { StartWorkflowRunDto } from './dto/start-workflow-run.dto.js';
import { CancelWorkflowRunDto } from './dto/cancel-workflow-run.dto.js';
import { ResumeWorkflowRunDto } from './dto/resume-workflow-run.dto.js';
import { RestoreToCheckpointDto } from './dto/restore-to-checkpoint.dto.js';
import { EditWorkNodeConfigDto } from './dto/edit-work-node-config.dto.js';
import { AddWorkNodeDto } from './dto/add-work-node.dto.js';
import { TaskNodeConfig, GitRefNodeConfig, McpServerRefNodeConfig } from '../domain/value-objects/index.js';
import { WorkflowId, GitId, McpServerId } from '@common/ids/index.js';
import { BrandedIdPipe } from '@common/presentation/pipes/branded-id.pipe.js';
import { WorkflowRunId, CheckpointId } from '../domain/value-objects/index.js';

@ApiTags('Workflow Runs')
@Controller('workflow-runs')
export class WorkflowRuntimeController {
  constructor(
    private readonly startUseCase: StartWorkflowRunUseCase,
    private readonly pauseUseCase: PauseWorkflowRunUseCase,
    private readonly resumeUseCase: ResumeWorkflowRunUseCase,
    private readonly cancelUseCase: CancelWorkflowRunUseCase,
    private readonly deleteUseCase: DeleteWorkflowRunUseCase,
    private readonly restoreToCheckpointUseCase: RestoreToCheckpointUseCase,
    private readonly editWorkNodeConfigUseCase: EditWorkNodeConfigUseCase,
    private readonly addWorkNodeUseCase: AddWorkNodeUseCase,
    private readonly removeWorkNodeUseCase: RemoveWorkNodeUseCase,
    private readonly listWorkflowRunsQuery: ListWorkflowRunsQuery,
    private readonly getWorkflowRunQuery: GetWorkflowRunQuery,
    private readonly getWorkflowRunSummaryQuery: GetWorkflowRunSummaryQuery,
    private readonly listCheckpointsQuery: ListCheckpointsQuery,
    private readonly getWorkspaceTreeQuery: GetWorkspaceTreeQuery,
    private readonly getWorkspaceFileQuery: GetWorkspaceFileQuery,
    private readonly pushBranchesUseCase: PushBranchesUseCase,
  ) {}

  @ApiOperation({ summary: 'Start a new workflow run' })
  @ApiResponse({ status: 201, description: 'Workflow run started' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @Post()
  async start(@Body() dto: StartWorkflowRunDto) {
    return this.startUseCase.execute({
      workflowId: WorkflowId.create(dto.workflowId),
      issueKey: dto.issueKey,
      seedValues: dto.seedValues,
    });
  }

  @ApiOperation({ summary: 'List all workflow runs' })
  @ApiResponse({ status: 200, description: 'List of workflow runs' })
  @Get()
  async list() {
    return this.listWorkflowRunsQuery.execute();
  }

  @ApiOperation({ summary: 'Get workflow run summary' })
  @ApiResponse({ status: 200, description: 'Summary of all workflow runs' })
  @Get('summary')
  async getSummary() {
    return this.getWorkflowRunSummaryQuery.execute();
  }

  @ApiOperation({ summary: 'Get workflow run by ID' })
  @ApiResponse({ status: 200, description: 'Workflow run details' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  @Get(':id')
  async getById(@Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId) {
    return this.getWorkflowRunQuery.execute({ workflowRunId: id });
  }

  @ApiOperation({ summary: 'List checkpoints for a workflow run' })
  @ApiResponse({ status: 200, description: 'List of checkpoints' })
  @Get(':id/checkpoints')
  async getCheckpoints(@Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId) {
    return this.listCheckpointsQuery.execute({ workflowRunId: id });
  }

  @ApiOperation({ summary: 'Pause a workflow run' })
  @ApiResponse({ status: 200, description: 'Workflow run paused' })
  @Post(':id/pause')
  @HttpCode(200)
  async pause(@Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId) {
    await this.pauseUseCase.execute({
      workflowRunId: id,
    });
  }

  @ApiOperation({ summary: 'Resume a paused workflow run' })
  @ApiResponse({ status: 200, description: 'Workflow run resumed' })
  @Post(':id/resume')
  @HttpCode(200)
  async resume(@Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId, @Body() dto: ResumeWorkflowRunDto) {
    await this.resumeUseCase.execute({
      workflowRunId: id,
      checkpointId: dto.checkpointId ? CheckpointId.create(dto.checkpointId) : undefined,
    });
  }

  @ApiOperation({ summary: 'Cancel a workflow run' })
  @ApiResponse({ status: 200, description: 'Workflow run cancelled' })
  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(@Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId, @Body() dto: CancelWorkflowRunDto) {
    await this.cancelUseCase.execute({
      workflowRunId: id,
      reason: dto.reason,
    });
  }

  @ApiOperation({ summary: 'Restore workflow run to a checkpoint' })
  @ApiResponse({ status: 200, description: 'Workflow run restored to checkpoint' })
  @Post(':id/restore')
  @HttpCode(200)
  async restoreToCheckpoint(
    @Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId,
    @Body() dto: RestoreToCheckpointDto,
  ) {
    await this.restoreToCheckpointUseCase.execute({
      workflowRunId: id,
      checkpointId: CheckpointId.create(dto.checkpointId),
    });
  }

  @ApiOperation({ summary: 'Get workspace file tree' })
  @ApiResponse({ status: 200, description: 'Workspace file tree' })
  @Get(':id/workspace/tree')
  async getWorkspaceTree(@Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId) {
    return this.getWorkspaceTreeQuery.execute(id);
  }

  @ApiOperation({ summary: 'Get workspace file content' })
  @ApiResponse({ status: 200, description: 'File content' })
  @ApiResponse({ status: 404, description: 'File or workspace not found' })
  @Get(':id/workspace/file')
  async getWorkspaceFile(
    @Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId,
    @Query('path') filePath: string,
  ) {
    return this.getWorkspaceFileQuery.execute(id, filePath);
  }

  @ApiOperation({ summary: 'Push branches of a completed workflow run to remote' })
  @ApiResponse({ status: 200, description: 'Push results' })
  @Post(':id/push')
  @HttpCode(200)
  async pushBranches(@Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId) {
    return this.pushBranchesUseCase.execute(id);
  }

  @ApiOperation({ summary: 'Delete a workflow run' })
  @ApiResponse({ status: 200, description: 'Workflow run deleted' })
  @Delete(':id')
  async delete(@Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId) {
    await this.deleteUseCase.execute({
      workflowRunId: id,
    });
  }

  @ApiOperation({ summary: 'Edit work node configuration' })
  @ApiResponse({ status: 200, description: 'Work node config updated' })
  @Put(':id/work-nodes/:sequence')
  async editWorkNodeConfig(
    @Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId,
    @Param('sequence', ParseIntPipe) sequence: number,
    @Body() dto: EditWorkNodeConfigDto,
  ) {
    await this.editWorkNodeConfigUseCase.execute({
      workflowRunId: id,
      sequence,
      model: dto.model,
      taskConfigs: dto.taskConfigs?.map((tc) => TaskNodeConfig.create(tc.order, tc.query)),
      pauseAfter: dto.pauseAfter,
      gitRefConfigs: dto.gitRefConfigs?.map((g) => GitRefNodeConfig.create(GitId.create(g.gitId), g.baseBranch)),
      mcpServerRefConfigs: dto.mcpServerRefConfigs?.map((m) => McpServerRefNodeConfig.create(McpServerId.create(m.mcpServerId), m.envOverrides)),
      reportFileRefs: dto.reportFileRefs,
    });
  }

  @ApiOperation({ summary: 'Add a work node to a workflow run' })
  @ApiResponse({ status: 201, description: 'Work node added' })
  @Post(':id/work-nodes')
  async addWorkNode(
    @Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId,
    @Body() dto: AddWorkNodeDto,
  ) {
    await this.addWorkNodeUseCase.execute({
      workflowRunId: id,
      model: dto.model,
      taskConfigs: dto.taskConfigs.map((tc) => TaskNodeConfig.create(tc.order, tc.query)),
      pauseAfter: dto.pauseAfter,
      gitRefConfigs: dto.gitRefConfigs?.map((g) => GitRefNodeConfig.create(GitId.create(g.gitId), g.baseBranch)),
      mcpServerRefConfigs: dto.mcpServerRefConfigs?.map((m) => McpServerRefNodeConfig.create(McpServerId.create(m.mcpServerId), m.envOverrides)),
      reportFileRefs: dto.reportFileRefs,
    });
  }

  @ApiOperation({ summary: 'Remove a work node from a workflow run' })
  @ApiResponse({ status: 200, description: 'Work node removed' })
  @Delete(':id/work-nodes/:sequence')
  async removeWorkNode(
    @Param('id', new BrandedIdPipe(WorkflowRunId, 'WorkflowRunId')) id: WorkflowRunId,
    @Param('sequence', ParseIntPipe) sequence: number,
  ) {
    await this.removeWorkNodeUseCase.execute({
      workflowRunId: id,
      sequence,
    });
  }
}
