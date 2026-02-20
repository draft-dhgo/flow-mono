import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsNotEmpty, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SectionDto {
  @ApiProperty({ description: 'Section title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Section description' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class ReportOutlineDto {
  @ApiProperty({ description: 'List of report sections', type: [SectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections!: SectionDto[];
}

export class TaskDefinitionDto {
  @ApiProperty({ description: 'Execution order of the task (0-based)', minimum: 0 })
  @IsNumber()
  @Min(0)
  order!: number;

  @ApiProperty({ description: 'Query string for the task' })
  @IsString()
  @IsNotEmpty()
  query!: string;

  @ApiPropertyOptional({ description: 'Report outline for structured output', type: ReportOutlineDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportOutlineDto)
  reportOutline?: ReportOutlineDto;
}

export class GitRefDto {
  @ApiProperty({ description: 'ID of the referenced Git repository' })
  @IsString()
  @IsNotEmpty()
  gitId!: string;

  @ApiProperty({ description: 'Base branch name for branching strategy' })
  @IsString()
  @IsNotEmpty()
  baseBranch!: string;
}

export class McpServerRefDto {
  @ApiProperty({ description: 'ID of the referenced MCP server' })
  @IsString()
  @IsNotEmpty()
  mcpServerId!: string;

  @ApiPropertyOptional({ description: 'Environment variable overrides for the MCP server' })
  @IsOptional()
  envOverrides?: Record<string, string>;
}

export class WorkDefinitionDto {
  @ApiProperty({ description: 'Execution order of the work node (0-based)', minimum: 0 })
  @IsNumber()
  @Min(0)
  order!: number;

  @ApiProperty({ description: 'AI model identifier to use for this work' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ description: 'List of task definitions for this work node', type: [TaskDefinitionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDefinitionDto)
  taskDefinitions!: TaskDefinitionDto[];

  @ApiPropertyOptional({ description: 'Git repository references for this work node', type: [GitRefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GitRefDto)
  gitRefs?: GitRefDto[];

  @ApiPropertyOptional({ description: 'MCP server references for this work node', type: [McpServerRefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => McpServerRefDto)
  mcpServerRefs?: McpServerRefDto[];

  @ApiPropertyOptional({ description: 'Whether to pause after this work node completes' })
  @IsOptional()
  @IsBoolean()
  pauseAfter?: boolean;
}

export class CreateWorkflowDto {
  @ApiProperty({ description: 'Workflow name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Workflow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Branch strategy for workflow execution' })
  @IsString()
  @IsNotEmpty()
  branchStrategy!: string;

  @ApiProperty({ description: 'List of work definitions composing this workflow', type: [WorkDefinitionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkDefinitionDto)
  workDefinitions!: WorkDefinitionDto[];

  @ApiProperty({ description: 'Git repository references for the workflow', type: [GitRefDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GitRefDto)
  gitRefs!: GitRefDto[];

  @ApiPropertyOptional({ description: 'MCP server references for the workflow', type: [McpServerRefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => McpServerRefDto)
  mcpServerRefs?: McpServerRefDto[];

  @ApiPropertyOptional({ description: 'Seed keys for parameterized workflow execution', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seedKeys?: string[];
}
