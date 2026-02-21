import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../../domain/ports/user-repository.js';
import { InvalidCredentialsError } from '../../domain/errors/index.js';

export interface LoginCommand {
  readonly username: string;
  readonly password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; username: string; displayName: string };
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const user = await this.userRepository.findByUsername(command.username);
    if (!user || !user.verifyPassword(command.password)) {
      throw new InvalidCredentialsError();
    }

    const payload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, displayName: user.displayName },
    };
  }
}
