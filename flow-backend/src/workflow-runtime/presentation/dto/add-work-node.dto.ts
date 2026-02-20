import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskNodeConfigDto, GitRefNodeConfigDto, McpServerRefNodeConfigDto } from './edit-work-node-config.dto.js';

export class AddWorkNodeDto {
  @ApiProperty({ description: 'AI model identifier to use for this work node' })
  @IsString()
  model!: string;

  @ApiProperty({ description: 'Task configurations for this work node', type: [TaskNodeConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskNodeConfigDto)
  taskConfigs!: TaskNodeConfigDto[];

  @ApiPropertyOptional({ description: 'Whether to pause after this work node completes' })
  @IsOptional()
  @IsBoolean()
  pauseAfter?: boolean;

  @ApiPropertyOptional({ description: 'Git repository reference configurations', type: [GitRefNodeConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GitRefNodeConfigDto)
  gitRefConfigs?: GitRefNodeConfigDto[];

  @ApiPropertyOptional({ description: 'MCP server reference configurations', type: [McpServerRefNodeConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => McpServerRefNodeConfigDto)
  mcpServerRefConfigs?: McpServerRefNodeConfigDto[];
}
