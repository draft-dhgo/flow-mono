import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/ports/user-repository.js';
import { User } from '../../domain/entities/user.js';
import { UserAlreadyExistsError } from '../../domain/errors/index.js';

export interface RegisterCommand {
  readonly username: string;
  readonly password: string;
  readonly displayName: string;
}

export interface RegisterResult {
  userId: string;
  username: string;
}

@Injectable()
export class RegisterUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    if (await this.userRepository.exists(command.username)) {
      throw new UserAlreadyExistsError(command.username);
    }

    const user = User.create({
      username: command.username,
      password: command.password,
      displayName: command.displayName,
    });

    await this.userRepository.save(user);
    return { userId: user.id, username: user.username };
  }
}
