import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SendChatMessageDto {
  @ApiProperty({ description: 'Message to send to the workspace agent' })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
