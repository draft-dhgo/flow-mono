import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class StartWorkflowRunDto {
  @ApiProperty({ description: 'ID of the workflow to run' })
  @IsString()
  @IsNotEmpty()
  workflowId!: string;

  @ApiProperty({ description: 'Issue key associated with this workflow run' })
  @IsString()
  @IsNotEmpty()
  issueKey!: string;

  @ApiPropertyOptional({ description: 'Seed values for parameterized execution (key-value pairs)' })
  @IsOptional()
  seedValues?: Record<string, string>;
}
