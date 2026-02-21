import type { User } from '../entities/user.js';
import type { UserId } from '@common/ids/index.js';

export abstract class UserRepository {
  abstract findById(id: UserId): Promise<User | null>;
  abstract findByUsername(username: string): Promise<User | null>;
  abstract save(user: User): Promise<void>;
  abstract exists(username: string): Promise<boolean>;
}
