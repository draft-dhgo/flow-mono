import { Injectable } from '@nestjs/common';
import { join, isAbsolute } from 'node:path';

@Injectable()
export class GitRepoPathFactory {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  resolve(relativePath: string): string {
    if (isAbsolute(relativePath)) {
      return relativePath;
    }
    return join(this.basePath, relativePath);
  }

  getBasePath(): string {
    return this.basePath;
  }
}
