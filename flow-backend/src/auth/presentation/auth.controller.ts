import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser, type JwtPayloadUser } from './decorators/current-user.decorator.js';
import { LoginUseCase } from '../application/commands/login-use-case.js';
import { RegisterUseCase } from '../application/commands/register-use-case.js';
import { RefreshTokenUseCase } from '../application/commands/refresh-token-use-case.js';
import { GetCurrentUserQuery } from '../application/queries/get-current-user-query.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly getCurrentUserQuery: GetCurrentUserQuery,
  ) {}

  @Public()
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 422, description: '아이디 또는 비밀번호 오류' })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute({
      username: dto.username,
      password: dto.password,
    });
  }

  @Public()
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 422, description: '이미 존재하는 사용자' })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute({
      username: dto.username,
      password: dto.password,
      displayName: dto.displayName,
    });
  }

  @Public()
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공' })
  @ApiResponse({ status: 422, description: '유효하지 않은 리프레시 토큰' })
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenUseCase.execute({
      refreshToken: dto.refreshToken,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 사용자 정보 조회' })
  @ApiResponse({ status: 200, description: '사용자 정보' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @Get('me')
  async me(@CurrentUser() user: JwtPayloadUser) {
    return this.getCurrentUserQuery.execute({ userId: user.userId });
  }
}
