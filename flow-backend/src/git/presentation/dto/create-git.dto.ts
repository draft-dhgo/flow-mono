import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateGitDto {
  @ApiProperty({ description: 'Git repository URL' })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiProperty({ description: 'Local filesystem path for the repository clone' })
  @IsString()
  @IsNotEmpty()
  localPath!: string;
}
