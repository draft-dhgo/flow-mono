import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TaskNodeConfigDto {
  @ApiProperty({ description: 'Execution order of the task (0-based)', minimum: 0 })
  @IsInt()
  @Min(0)
  order!: number;

  @ApiProperty({ description: 'Query string for the task' })
  @IsString()
  query!: string;
}

export class GitRefNodeConfigDto {
  @ApiProperty({ description: 'ID of the referenced Git repository' })
  @IsString()
  gitId!: string;

  @ApiProperty({ description: 'Base branch name for branching strategy' })
  @IsString()
  baseBranch!: string;
}

export class McpServerRefNodeConfigDto {
  @ApiProperty({ description: 'ID of the referenced MCP server' })
  @IsString()
  mcpServerId!: string;

  @ApiPropertyOptional({ description: 'Environment variable overrides for the MCP server' })
  @IsOptional()
  envOverrides?: Record<string, string>;
}

export class EditWorkNodeConfigDto {
  @ApiPropertyOptional({ description: 'AI model identifier to use' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Updated task configurations', type: [TaskNodeConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskNodeConfigDto)
  taskConfigs?: TaskNodeConfigDto[];

  @ApiPropertyOptional({ description: 'Whether to pause after this work node completes' })
  @IsOptional()
  @IsBoolean()
  pauseAfter?: boolean;

  @ApiPropertyOptional({ description: 'Updated Git repository reference configurations', type: [GitRefNodeConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GitRefNodeConfigDto)
  gitRefConfigs?: GitRefNodeConfigDto[];

  @ApiPropertyOptional({ description: 'Updated MCP server reference configurations', type: [McpServerRefNodeConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => McpServerRefNodeConfigDto)
  mcpServerRefConfigs?: McpServerRefNodeConfigDto[];

  @ApiPropertyOptional({ description: 'Indices of previous work nodes whose reports to symlink', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  reportFileRefs?: number[];
}
