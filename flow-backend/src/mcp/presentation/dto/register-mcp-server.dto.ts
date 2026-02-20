import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum } from 'class-validator';
import { McpTransportType } from '../../domain/index.js';

export class RegisterMcpServerDto {
  @ApiProperty({ description: 'MCP server display name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Command to start the MCP server process' })
  @IsString()
  @IsNotEmpty()
  command!: string;

  @ApiPropertyOptional({ description: 'Command-line arguments for the MCP server', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  args?: string[];

  @ApiPropertyOptional({ description: 'Environment variables for the MCP server process' })
  @IsOptional()
  env?: Record<string, string>;

  @ApiProperty({ description: 'Transport type for MCP communication', enum: McpTransportType })
  @IsEnum(McpTransportType)
  transportType!: McpTransportType;

  @ApiPropertyOptional({ description: 'URL for remote MCP server connection', nullable: true })
  @IsOptional()
  @IsString()
  url?: string | null;
}
