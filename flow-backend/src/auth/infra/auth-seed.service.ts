import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { UserRepository } from '../domain/ports/user-repository.js';
import { User } from '../domain/entities/user.js';

@Injectable()
export class AuthSeedService implements OnModuleInit {
  private readonly logger = new Logger(AuthSeedService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async onModuleInit(): Promise<void> {
    if (await this.userRepository.exists('admin')) {
      return;
    }

    const admin = User.create({
      username: 'admin',
      password: 'admin1234',
      displayName: '관리자',
    });

    await this.userRepository.save(admin);
    this.logger.log('Seed user created: admin / admin1234');
  }
}
