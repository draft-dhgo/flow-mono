import { Controller, Post, Delete, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StartAgentSessionUseCase } from '../application/commands/start-agent-session-use-case.js';
import { SendAgentQueryUseCase } from '../application/commands/send-agent-query-use-case.js';
import { StopAgentSessionUseCase } from '../application/commands/stop-agent-session-use-case.js';
import { GetAgentSessionQuery } from '../application/queries/get-agent-session-query.js';
import { StartAgentSessionDto } from './dto/start-agent-session.dto.js';
import { SendAgentQueryDto } from './dto/send-agent-query.dto.js';
import { WorkExecutionId, WorkflowRunId } from '@common/ids/index.js';
import { BrandedIdPipe } from '@common/presentation/pipes/branded-id.pipe.js';
import type { McpServerConfig } from '@common/ports/index.js';

@ApiTags('Agent Sessions')
@Controller('agent-sessions')
export class AgentController {
  constructor(
    private readonly startUseCase: StartAgentSessionUseCase,
    private readonly sendQueryUseCase: SendAgentQueryUseCase,
    private readonly stopUseCase: StopAgentSessionUseCase,
    private readonly getAgentSessionQuery: GetAgentSessionQuery,
  ) {}

  @ApiOperation({ summary: 'Get agent session by work execution ID' })
  @ApiResponse({ status: 200, description: 'Agent session details' })
  @ApiResponse({ status: 404, description: 'Agent session not found' })
  @Get(':id')
  async getByWorkExecutionId(@Param('id', new BrandedIdPipe(WorkExecutionId, 'WorkExecutionId')) id: WorkExecutionId) {
    return this.getAgentSessionQuery.execute({ workExecutionId: id });
  }

  @ApiOperation({ summary: 'Start a new agent session' })
  @ApiResponse({ status: 201, description: 'Agent session started' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @Post()
  async start(@Body() dto: StartAgentSessionDto) {
    return this.startUseCase.execute({
      workExecutionId: WorkExecutionId.create(dto.workExecutionId),
      workflowRunId: WorkflowRunId.create(dto.workflowRunId),
      model: dto.model,
      workspacePath: dto.workspacePath,
      mcpServerConfigs: dto.mcpServerConfigs as unknown as McpServerConfig[],
    });
  }

  @ApiOperation({ summary: 'Send a query to an agent session' })
  @ApiResponse({ status: 201, description: 'Query sent' })
  @Post(':id/queries')
  async sendQuery(@Param('id', new BrandedIdPipe(WorkExecutionId, 'WorkExecutionId')) id: WorkExecutionId, @Body() dto: SendAgentQueryDto) {
    return this.sendQueryUseCase.execute({
      workExecutionId: id,
      query: dto.query,
    });
  }

  @ApiOperation({ summary: 'Stop an agent session' })
  @ApiResponse({ status: 200, description: 'Agent session stopped' })
  @Delete(':id')
  async stop(@Param('id', new BrandedIdPipe(WorkExecutionId, 'WorkExecutionId')) id: WorkExecutionId) {
    await this.stopUseCase.execute({
      workExecutionId: id,
    });
  }
}
