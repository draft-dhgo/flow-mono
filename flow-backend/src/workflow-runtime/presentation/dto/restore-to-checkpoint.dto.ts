import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RestoreToCheckpointDto {
  @ApiProperty({ description: 'ID of the checkpoint to restore to' })
  @IsString()
  @IsNotEmpty()
  checkpointId!: string;
}
