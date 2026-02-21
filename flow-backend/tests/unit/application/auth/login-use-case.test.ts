import { describe, it, expect, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { LoginUseCase } from '@auth/application/commands/login-use-case.js';
import { InMemoryUserRepository } from '@auth/infra/in-memory-user-repository.js';
import { User } from '@auth/domain/entities/user.js';
import { InvalidCredentialsError } from '@auth/domain/errors/index.js';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepo: InMemoryUserRepository;
  let jwtService: JwtService;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    jwtService = new JwtService({ secret: 'test-secret' });
    useCase = new LoginUseCase(userRepo, jwtService);

    const user = User.create({
      username: 'admin',
      password: 'admin1234',
      displayName: '관리자',
    });
    await userRepo.save(user);
  });

  it('returns tokens on valid credentials', async () => {
    const result = await useCase.execute({ username: 'admin', password: 'admin1234' });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.username).toBe('admin');
    expect(result.user.displayName).toBe('관리자');
  });

  it('throws InvalidCredentialsError on wrong password', async () => {
    await expect(useCase.execute({ username: 'admin', password: 'wrong' })).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError on non-existent user', async () => {
    await expect(useCase.execute({ username: 'nobody', password: 'admin1234' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('returns valid JWT access token', async () => {
    const result = await useCase.execute({ username: 'admin', password: 'admin1234' });
    const decoded = jwtService.verify(result.accessToken);
    expect(decoded.username).toBe('admin');
    expect(decoded.sub).toBeDefined();
  });
});
