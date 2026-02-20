import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SendAgentQueryDto {
  @ApiProperty({ description: 'Query to send to the agent' })
  @IsString()
  @IsNotEmpty()
  query!: string;
}
