import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/ports/user-repository.js';
import { UserId } from '@common/ids/index.js';
import { ApplicationError } from '@common/errors/application-error.js';

export interface CurrentUserReadModel {
  id: string;
  username: string;
  displayName: string;
}

@Injectable()
export class GetCurrentUserQuery {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(params: { userId: string }): Promise<CurrentUserReadModel> {
    const user = await this.userRepository.findById(UserId.create(params.userId));
    if (!user) {
      throw new ApplicationError('USER_NOT_FOUND', `사용자를 찾을 수 없습니다: ${params.userId}`);
    }
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    };
  }
}
