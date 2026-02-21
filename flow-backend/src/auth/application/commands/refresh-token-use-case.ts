import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../../domain/ports/user-repository.js';
import { UserId } from '@common/ids/index.js';
import { InvalidRefreshTokenError } from '../../domain/errors/index.js';

export interface RefreshTokenCommand {
  readonly refreshToken: string;
}

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    let payload: { sub: string; username: string };
    try {
      payload = this.jwtService.verify(command.refreshToken);
    } catch {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.userRepository.findById(UserId.create(payload.sub));
    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    const newPayload = { sub: user.id, username: user.username };
    return {
      accessToken: this.jwtService.sign(newPayload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(newPayload, { expiresIn: '7d' }),
    };
  }
}
