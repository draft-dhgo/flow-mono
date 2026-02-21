import { Injectable } from '@nestjs/common';
import type { User } from '../domain/entities/user.js';
import type { UserId } from '@common/ids/index.js';
import { UserRepository } from '../domain/ports/user-repository.js';

@Injectable()
export class InMemoryUserRepository extends UserRepository {
  private readonly store = new Map<UserId, User>();

  async findById(id: UserId): Promise<User | null> {
    return this.store.get(id) ?? null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return [...this.store.values()].find((u) => u.username === username) ?? null;
  }

  async save(user: User): Promise<void> {
    this.store.set(user.id, user);
  }

  async exists(username: string): Promise<boolean> {
    return [...this.store.values()].some((u) => u.username === username);
  }
}
