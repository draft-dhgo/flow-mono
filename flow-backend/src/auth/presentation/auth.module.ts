import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserRepository } from '../domain/ports/user-repository.js';
import { InMemoryUserRepository } from '../infra/in-memory-user-repository.js';
import { AuthSeedService } from '../infra/auth-seed.service.js';
import { LoginUseCase } from '../application/commands/login-use-case.js';
import { RegisterUseCase } from '../application/commands/register-use-case.js';
import { RefreshTokenUseCase } from '../application/commands/refresh-token-use-case.js';
import { GetCurrentUserQuery } from '../application/queries/get-current-user-query.js';
import { JwtStrategy } from './guards/jwt.strategy.js';
import { AuthController } from './auth.controller.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'flowflow-dev-secret-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [
    { provide: UserRepository, useClass: InMemoryUserRepository },
    JwtStrategy,
    AuthSeedService,
    LoginUseCase,
    RegisterUseCase,
    RefreshTokenUseCase,
    GetCurrentUserQuery,
  ],
  controllers: [AuthController],
  exports: [UserRepository],
})
export class AuthModule {}
