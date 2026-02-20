import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelWorkflowRunDto {
  @ApiPropertyOptional({ description: 'Reason for cancelling the workflow run' })
  @IsOptional()
  @IsString()
  reason?: string;
}
