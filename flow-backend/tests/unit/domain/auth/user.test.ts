import { describe, it, expect } from 'vitest';
import { User } from '@auth/domain/entities/user.js';

describe('User', () => {
  const validProps = {
    username: 'testuser',
    password: 'password123',
    displayName: '테스트 사용자',
  };

  it('creates with correct properties', () => {
    const user = User.create(validProps);
    expect(user.id).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.displayName).toBe('테스트 사용자');
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe('password123');
  });

  it('verifyPassword returns true for correct password', () => {
    const user = User.create(validProps);
    expect(user.verifyPassword('password123')).toBe(true);
  });

  it('verifyPassword returns false for wrong password', () => {
    const user = User.create(validProps);
    expect(user.verifyPassword('wrongpassword')).toBe(false);
  });

  it('throws on empty username', () => {
    expect(() => User.create({ ...validProps, username: '' })).toThrow();
  });

  it('throws on short username (< 3 chars)', () => {
    expect(() => User.create({ ...validProps, username: 'ab' })).toThrow();
  });

  it('throws on short password (< 6 chars)', () => {
    expect(() => User.create({ ...validProps, password: '12345' })).toThrow();
  });

  it('throws on empty password', () => {
    expect(() => User.create({ ...validProps, password: '' })).toThrow();
  });

  it('throws on empty displayName', () => {
    expect(() => User.create({ ...validProps, displayName: '' })).toThrow();
  });

  it('throws on blank displayName', () => {
    expect(() => User.create({ ...validProps, displayName: '   ' })).toThrow();
  });

  it('fromProps restores entity', () => {
    const user = User.create(validProps);
    const restored = User.fromProps({
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      displayName: user.displayName,
    });
    expect(restored.id).toBe(user.id);
    expect(restored.username).toBe('testuser');
    expect(restored.verifyPassword('password123')).toBe(true);
  });
});
