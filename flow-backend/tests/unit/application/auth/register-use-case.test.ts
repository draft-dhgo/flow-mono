import { describe, it, expect, beforeEach } from 'vitest';
import { RegisterUseCase } from '@auth/application/commands/register-use-case.js';
import { InMemoryUserRepository } from '@auth/infra/in-memory-user-repository.js';
import { User } from '@auth/domain/entities/user.js';
import { UserAlreadyExistsError } from '@auth/domain/errors/index.js';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let userRepo: InMemoryUserRepository;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    useCase = new RegisterUseCase(userRepo);
  });

  it('creates a new user', async () => {
    const result = await useCase.execute({
      username: 'newuser',
      password: 'password123',
      displayName: '새 사용자',
    });
    expect(result.userId).toBeDefined();
    expect(result.username).toBe('newuser');
  });

  it('persists user in repository', async () => {
    await useCase.execute({
      username: 'newuser',
      password: 'password123',
      displayName: '새 사용자',
    });
    const user = await userRepo.findByUsername('newuser');
    expect(user).not.toBeNull();
    expect(user!.displayName).toBe('새 사용자');
  });

  it('throws UserAlreadyExistsError on duplicate username', async () => {
    const existing = User.create({
      username: 'admin',
      password: 'admin1234',
      displayName: '관리자',
    });
    await userRepo.save(existing);

    await expect(
      useCase.execute({ username: 'admin', password: 'newpass123', displayName: '다른이름' }),
    ).rejects.toThrow(UserAlreadyExistsError);
  });
});
