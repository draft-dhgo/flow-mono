import { hashSync, compareSync } from 'bcryptjs';
import type { UserId } from '@common/ids/index.js';
import { UserId as UserIdFactory } from '@common/ids/index.js';
import { AuthDomainError } from '../errors/auth-errors.js';

export interface UserProps {
  id: UserId;
  username: string;
  passwordHash: string;
  displayName: string;
}

export interface CreateUserProps {
  username: string;
  password: string;
  displayName: string;
}

const SALT_ROUNDS = 10;

export class User {
  private readonly _id: UserId;
  private readonly _username: string;
  private readonly _passwordHash: string;
  private readonly _displayName: string;

  private constructor(props: UserProps) {
    this._id = props.id;
    this._username = props.username;
    this._passwordHash = props.passwordHash;
    this._displayName = props.displayName;
  }

  static create(props: CreateUserProps): User {
    if (!props.username.trim()) {
      throw new AuthDomainError('AUTH_INVARIANT_VIOLATION', '사용자 ID는 비어있을 수 없습니다');
    }
    if (props.username.length < 3) {
      throw new AuthDomainError('AUTH_INVARIANT_VIOLATION', '사용자 ID는 3자 이상이어야 합니다');
    }
    if (!props.password || props.password.length < 6) {
      throw new AuthDomainError('AUTH_INVARIANT_VIOLATION', '비밀번호는 6자 이상이어야 합니다');
    }
    if (!props.displayName.trim()) {
      throw new AuthDomainError('AUTH_INVARIANT_VIOLATION', '표시 이름은 비어있을 수 없습니다');
    }

    const id = UserIdFactory.generate();
    const passwordHash = hashSync(props.password, SALT_ROUNDS);

    return new User({ id, username: props.username, passwordHash, displayName: props.displayName });
  }

  static fromProps(props: UserProps): User {
    return new User(props);
  }

  get id(): UserId {
    return this._id;
  }
  get username(): string {
    return this._username;
  }
  get passwordHash(): string {
    return this._passwordHash;
  }
  get displayName(): string {
    return this._displayName;
  }

  verifyPassword(plaintext: string): boolean {
    return compareSync(plaintext, this._passwordHash);
  }
}
