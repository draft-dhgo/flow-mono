import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateWorkflowUseCase } from '../application/commands/create-workflow-use-case.js';
import { UpdateWorkflowUseCase } from '../application/commands/update-workflow-use-case.js';
import { DeleteWorkflowUseCase } from '../application/commands/delete-workflow-use-case.js';
import { ActivateWorkflowUseCase } from '../application/commands/activate-workflow-use-case.js';
import { DeactivateWorkflowUseCase } from '../application/commands/deactivate-workflow-use-case.js';
import { ListWorkflowsQuery } from '../application/queries/list-workflows-query.js';
import { GetWorkflowQuery } from '../application/queries/get-workflow-query.js';
import { CreateWorkflowDto, type GitRefDto, type McpServerRefDto, type WorkDefinitionDto } from './dto/create-workflow.dto.js';
import { UpdateWorkflowDto } from './dto/update-workflow.dto.js';
import { GitRef, McpServerRef, WorkDefinition, TaskDefinition, AgentModel } from '../domain/value-objects/index.js';
import { Section } from '@common/value-objects/index.js';
import { ReportOutline } from '../domain/value-objects/index.js';
import { WorkflowId, GitId, McpServerId } from '@common/ids/index.js';
import { BrandedIdPipe } from '@common/presentation/pipes/branded-id.pipe.js';
import { ApplicationError } from '@common/errors/index.js';

@ApiTags('Workflows')
@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly createUseCase: CreateWorkflowUseCase,
    private readonly updateUseCase: UpdateWorkflowUseCase,
    private readonly deleteUseCase: DeleteWorkflowUseCase,
    private readonly activateUseCase: ActivateWorkflowUseCase,
    private readonly deactivateUseCase: DeactivateWorkflowUseCase,
    private readonly listWorkflowsQuery: ListWorkflowsQuery,
    private readonly getWorkflowQuery: GetWorkflowQuery,
  ) {}

  @ApiOperation({ summary: 'List all workflows' })
  @ApiResponse({ status: 200, description: 'List of all workflows' })
  @Get()
  async findAll() {
    return this.listWorkflowsQuery.execute();
  }

  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow details' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @Get(':id')
  async findById(@Param('id', new BrandedIdPipe(WorkflowId, 'WorkflowId')) id: WorkflowId) {
    return this.getWorkflowQuery.execute({ workflowId: id });
  }

  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @Post()
  async create(@Body() dto: CreateWorkflowDto) {
    return this.createUseCase.execute({
      name: dto.name,
      description: dto.description,
      branchStrategy: dto.branchStrategy,
      workDefinitions: dto.workDefinitions.map((wd) => this.toWorkDefinition(wd)),
      gitRefs: dto.gitRefs.map((r) => this.toGitRef(r)),
      mcpServerRefs: dto.mcpServerRefs?.map((r) => this.toMcpServerRef(r)),
      seedKeys: dto.seedKeys,
    });
  }

  @ApiOperation({ summary: 'Update a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @Put(':id')
  async update(@Param('id', new BrandedIdPipe(WorkflowId, 'WorkflowId')) id: WorkflowId, @Body() dto: UpdateWorkflowDto) {
    await this.updateUseCase.execute({
      workflowId: id,
      name: dto.name,
      description: dto.description,
      workDefinitions: dto.workDefinitions?.map((wd) => this.toWorkDefinition(wd)),
      gitRefs: dto.gitRefs?.map((r) => this.toGitRef(r)),
      mcpServerRefs: dto.mcpServerRefs?.map((r) => this.toMcpServerRef(r)),
      seedKeys: dto.seedKeys,
    });
  }

  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @Delete(':id')
  async delete(@Param('id', new BrandedIdPipe(WorkflowId, 'WorkflowId')) id: WorkflowId) {
    await this.deleteUseCase.execute({
      workflowId: id,
    });
  }

  @ApiOperation({ summary: 'Activate a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow activated' })
  @Post(':id/activate')
  @HttpCode(200)
  async activate(@Param('id', new BrandedIdPipe(WorkflowId, 'WorkflowId')) id: WorkflowId) {
    await this.activateUseCase.execute({
      workflowId: id,
    });
  }

  @ApiOperation({ summary: 'Deactivate a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deactivated' })
  @Post(':id/deactivate')
  @HttpCode(200)
  async deactivate(@Param('id', new BrandedIdPipe(WorkflowId, 'WorkflowId')) id: WorkflowId) {
    await this.deactivateUseCase.execute({
      workflowId: id,
    });
  }

  private toGitRef(dto: GitRefDto): GitRef {
    return GitRef.create(GitId.create(dto.gitId), dto.baseBranch);
  }

  private toMcpServerRef(dto: McpServerRefDto): McpServerRef {
    return McpServerRef.create(McpServerId.create(dto.mcpServerId), dto.envOverrides);
  }

  private toWorkDefinition(dto: WorkDefinitionDto): WorkDefinition {
    if (!Array.isArray(dto.taskDefinitions)) {
      throw new ApplicationError('INVALID_INPUT', 'workDefinitions[].taskDefinitions is required and must be an array');
    }
    const taskDefs = dto.taskDefinitions.map((td) => {
      const reportOutline = td.reportOutline
        ? ReportOutline.create(td.reportOutline.sections.map((s) => Section.create(s.title, s.description)))
        : undefined;
      return TaskDefinition.create(td.order, td.query, reportOutline);
    });
    return WorkDefinition.create(
      dto.order,
      AgentModel.create(dto.model),
      taskDefs,
      dto.gitRefs?.map((r) => this.toGitRef(r)),
      dto.mcpServerRefs?.map((r) => this.toMcpServerRef(r)),
      dto.pauseAfter,
      dto.reportFileRefs,
    );
  }
}
