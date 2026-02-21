import { DomainError } from '@common/errors/index.js';

export class AuthDomainError extends DomainError {
  constructor(code: string, message: string, isTransient: boolean = false) {
    super(code, message, isTransient);
  }
}

export class InvalidCredentialsError extends AuthDomainError {
  constructor() {
    super('INVALID_CREDENTIALS', '아이디 또는 비밀번호가 올바르지 않습니다');
  }
}

export class UserAlreadyExistsError extends AuthDomainError {
  constructor(username: string) {
    super('USER_ALREADY_EXISTS', `이미 존재하는 사용자입니다: ${username}`);
  }
}

export class InvalidRefreshTokenError extends AuthDomainError {
  constructor() {
    super('INVALID_REFRESH_TOKEN', '유효하지 않거나 만료된 리프레시 토큰입니다');
  }
}
