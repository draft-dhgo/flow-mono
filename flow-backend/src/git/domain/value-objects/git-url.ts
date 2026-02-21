import type { Brand } from '@common/ids/index.js';
import { GitInvariantViolationError } from '../errors/index.js';

const GIT_URL_PATTERNS = [
  /^https?:\/\/.+\.git$/,
  /^git:\/\/.+\.git$/,
  /^ssh:\/\/.+\.git$/,
  /^git@.+:.+\.git$/,
  /^https?:\/\/.+/,
  /^git@.+:.+/,
];

/**
 * SSRF 방어: 내부 네트워크 주소 차단
 * 프라이빗 IP, localhost, link-local 주소를 차단한다.
 */
function containsInternalHost(url: string): boolean {
  try {
    // ssh 형식 (git@host:path)은 별도 처리
    const sshMatch = url.match(/^git@([^:]+):/);
    const hostname = sshMatch ? sshMatch[1] : new URL(url).hostname;
    const lower = hostname.toLowerCase();

    // localhost / loopback
    if (lower === 'localhost' || lower === '[::1]') return true;

    // IP 기반 검사
    const ipMatch = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const [, a, b] = ipMatch.map(Number);
      if (a === 127) return true;          // 127.0.0.0/8 loopback
      if (a === 10) return true;           // 10.0.0.0/8 private
      if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
      if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
      if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
      if (a === 0) return true;            // 0.0.0.0
    }

    return false;
  } catch {
    return false;
  }
}

export type GitUrl = Brand<string, 'GitUrl'>;

export const GitUrl = {
  create(value: string): GitUrl {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new GitInvariantViolationError('Git URL cannot be empty');
    }
    const isValid = GIT_URL_PATTERNS.some((pattern) => pattern.test(trimmed));
    if (!isValid) {
      throw new GitInvariantViolationError(`Invalid Git URL format: "${trimmed}"`);
    }
    if (containsInternalHost(trimmed)) {
      throw new GitInvariantViolationError('Git URL must not point to internal/private network addresses');
    }
    return trimmed as GitUrl;
  },
  isValid(value: unknown): value is GitUrl {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return GIT_URL_PATTERNS.some((pattern) => pattern.test(trimmed)) && !containsInternalHost(trimmed);
  },
};
