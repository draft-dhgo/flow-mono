import { Controller, Post, Delete, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegisterMcpServerUseCase } from '../application/commands/register-mcp-server-use-case.js';
import { UnregisterMcpServerUseCase } from '../application/commands/unregister-mcp-server-use-case.js';
import { ListMcpServersQuery } from '../application/queries/list-mcp-servers-query.js';
import { GetMcpServerQuery } from '../application/queries/get-mcp-server-query.js';
import { RegisterMcpServerDto } from './dto/register-mcp-server.dto.js';
import { McpServerId } from '@common/ids/index.js';
import { BrandedIdPipe } from '@common/presentation/pipes/branded-id.pipe.js';

@ApiTags('MCP Servers')
@Controller('mcp-servers')
export class McpController {
  constructor(
    private readonly registerUseCase: RegisterMcpServerUseCase,
    private readonly unregisterUseCase: UnregisterMcpServerUseCase,
    private readonly listMcpServersQuery: ListMcpServersQuery,
    private readonly getMcpServerQuery: GetMcpServerQuery,
  ) {}

  @ApiOperation({ summary: 'List all MCP servers' })
  @ApiResponse({ status: 200, description: 'List of MCP servers' })
  @Get()
  async findAll() {
    return this.listMcpServersQuery.execute();
  }

  @ApiOperation({ summary: 'Get MCP server by ID' })
  @ApiResponse({ status: 200, description: 'MCP server details' })
  @ApiResponse({ status: 404, description: 'MCP server not found' })
  @Get(':id')
  async findById(@Param('id', new BrandedIdPipe(McpServerId, 'McpServerId')) id: McpServerId) {
    return this.getMcpServerQuery.execute({ mcpServerId: id });
  }

  @ApiOperation({ summary: 'Register a new MCP server' })
  @ApiResponse({ status: 201, description: 'MCP server registered' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @Post()
  async register(@Body() dto: RegisterMcpServerDto) {
    return this.registerUseCase.execute({
      name: dto.name,
      command: dto.command,
      args: dto.args,
      env: dto.env,
      transportType: dto.transportType,
      url: dto.url,
    });
  }

  @ApiOperation({ summary: 'Unregister an MCP server' })
  @ApiResponse({ status: 200, description: 'MCP server unregistered' })
  @ApiResponse({ status: 404, description: 'MCP server not found' })
  @Delete(':id')
  async unregister(@Param('id', new BrandedIdPipe(McpServerId, 'McpServerId')) id: McpServerId) {
    await this.unregisterUseCase.execute({
      mcpServerId: id,
    });
  }
}
