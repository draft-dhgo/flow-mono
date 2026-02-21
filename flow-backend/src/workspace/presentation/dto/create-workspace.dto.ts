import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkspacePurpose } from '../../domain/value-objects/workspace-purpose.js';

export class CreateWorkspaceGitRefDto {
  @ApiProperty({ description: 'Git repository ID' })
  @IsString()
  @IsNotEmpty()
  gitId!: string;

  @ApiProperty({ description: 'Base branch to create worktree from' })
  @IsString()
  @IsNotEmpty()
  baseBranch!: string;

  @ApiPropertyOptional({ description: 'New branch name for the worktree (optional for builder)' })
  @IsOptional()
  @IsString()
  branchName?: string;
}

export class CreateWorkspaceMcpServerRefDto {
  @ApiProperty({ description: 'MCP server ID' })
  @IsString()
  @IsNotEmpty()
  mcpServerId!: string;

  @ApiPropertyOptional({ description: 'Environment variable overrides' })
  @IsOptional()
  envOverrides?: Record<string, string>;
}

export class CreateWorkspaceDto {
  @ApiProperty({ description: 'Workspace name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'AI model identifier' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ description: 'Git repository references', type: [CreateWorkspaceGitRefDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkspaceGitRefDto)
  gitRefs!: CreateWorkspaceGitRefDto[];

  @ApiPropertyOptional({ description: 'MCP server references', type: [CreateWorkspaceMcpServerRefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkspaceMcpServerRefDto)
  mcpServerRefs?: CreateWorkspaceMcpServerRefDto[];

  @ApiPropertyOptional({ description: 'Workspace purpose', enum: WorkspacePurpose })
  @IsOptional()
  @IsEnum(WorkspacePurpose)
  purpose?: WorkspacePurpose;
}
