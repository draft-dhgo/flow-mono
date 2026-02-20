import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class McpServerConfigDto {
  @ApiProperty({ description: 'MCP server display name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Command to start the MCP server process' })
  @IsString()
  @IsNotEmpty()
  command!: string;

  @ApiProperty({ description: 'Command-line arguments for the MCP server', type: [String] })
  @IsArray()
  @IsString({ each: true })
  args!: string[];

  @ApiProperty({ description: 'Environment variables for the MCP server process' })
  env!: Record<string, string>;

  @ApiProperty({ description: 'Transport type for MCP communication' })
  @IsString()
  @IsNotEmpty()
  transportType!: string;

  @ApiPropertyOptional({ description: 'URL for remote MCP server connection', nullable: true })
  @IsOptional()
  @IsString()
  url!: string | null;
}

export class StartAgentSessionDto {
  @ApiProperty({ description: 'ID of the work execution to associate with this session' })
  @IsString()
  @IsNotEmpty()
  workExecutionId!: string;

  @ApiProperty({ description: 'ID of the workflow run this session belongs to' })
  @IsString()
  @IsNotEmpty()
  workflowRunId!: string;

  @ApiProperty({ description: 'AI model identifier to use for the agent session' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ description: 'Filesystem path to the agent workspace' })
  @IsString()
  @IsNotEmpty()
  workspacePath!: string;

  @ApiProperty({ description: 'MCP server configurations for the agent session', type: [McpServerConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => McpServerConfigDto)
  mcpServerConfigs!: McpServerConfigDto[];
}
