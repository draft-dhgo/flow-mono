import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '사용자 ID', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ description: '비밀번호', example: 'admin1234' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
