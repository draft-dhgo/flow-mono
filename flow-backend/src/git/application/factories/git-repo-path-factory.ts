import { Injectable } from '@nestjs/common';
import { join, resolve } from 'node:path';
import { ApplicationError } from '@common/errors/index.js';

@Injectable()
export class GitRepoPathFactory {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  resolve(relativePath: string): string {
    // 절대경로 차단 — 반드시 basePath 하위에 위치해야 함
    const resolved = resolve(this.basePath, relativePath);
    const normalizedBase = resolve(this.basePath);

    if (!resolved.startsWith(normalizedBase + '/') && resolved !== normalizedBase) {
      throw new ApplicationError(
        'INVALID_PATH',
        `경로가 허용된 범위를 벗어납니다: ${relativePath}`,
      );
    }

    return join(this.basePath, relativePath);
  }

  getBasePath(): string {
    return this.basePath;
  }
}
