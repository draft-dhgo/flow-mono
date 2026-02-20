import { LinkType } from './enums.js';
import { RuntimeInvariantViolationError } from '../errors/index.js';

export class SymLink {
  readonly type: LinkType;
  readonly targetId: string;
  readonly targetPath: string;
  readonly linkPath: string;

  private constructor(type: LinkType, targetId: string, targetPath: string, linkPath: string) {
    this.type = type;
    this.targetId = targetId;
    this.targetPath = targetPath;
    this.linkPath = linkPath;
  }

  static create(type: LinkType, targetId: string, targetPath: string, linkPath: string): SymLink {
    if (!targetPath.trim()) throw new RuntimeInvariantViolationError('SymLink', 'Target path cannot be empty');
    if (!linkPath.trim()) throw new RuntimeInvariantViolationError('SymLink', 'Link path cannot be empty');
    return new SymLink(type, targetId, targetPath, linkPath);
  }

  static fromProps(type: LinkType, targetId: string, targetPath: string, linkPath: string): SymLink {
    return new SymLink(type, targetId, targetPath, linkPath);
  }
}
