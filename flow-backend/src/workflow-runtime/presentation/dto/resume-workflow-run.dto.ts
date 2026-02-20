import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResumeWorkflowRunDto {
  @ApiPropertyOptional({ description: 'Checkpoint ID to resume from (resumes from latest if omitted)' })
  @IsOptional()
  @IsString()
  checkpointId?: string;
}
