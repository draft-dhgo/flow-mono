import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkDefinitionDto, GitRefDto, McpServerRefDto } from './create-workflow.dto.js';

export class UpdateWorkflowDto {
  @ApiPropertyOptional({ description: 'Seed keys for parameterized workflow execution', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seedKeys?: string[];

  @ApiPropertyOptional({ description: 'Updated workflow name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Updated workflow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Updated work definitions', type: [WorkDefinitionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkDefinitionDto)
  workDefinitions?: WorkDefinitionDto[];

  @ApiPropertyOptional({ description: 'Updated Git repository references', type: [GitRefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GitRefDto)
  gitRefs?: GitRefDto[];

  @ApiPropertyOptional({ description: 'Updated MCP server references', type: [McpServerRefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => McpServerRefDto)
  mcpServerRefs?: McpServerRefDto[];
}
