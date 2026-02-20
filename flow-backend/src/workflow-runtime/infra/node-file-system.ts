import {
  mkdir,
  rm,
  access,
  stat as fsStat,
  writeFile,
  readFile,
  unlink,
  symlink,
  readdir,
  cp,
  rename,
} from 'node:fs/promises';
import { constants } from 'node:fs';
import { FileSystem } from '../domain/ports/file-system.js';
import type { FileSystemStats } from '../domain/ports/file-system.js';

export class NodeFileSystem extends FileSystem {
  async createDirectory(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  async deleteDirectory(path: string): Promise<void> {
    await rm(path, { recursive: true, force: true });
  }

  async directoryExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      const s = await fsStat(path);
      return s.isDirectory();
    } catch {
      return false;
    }
  }

  async createFile(path: string, content: string): Promise<void> {
    await writeFile(path, content, 'utf-8');
  }

  async readFile(path: string): Promise<string> {
    return readFile(path, 'utf-8');
  }

  async deleteFile(path: string): Promise<void> {
    await unlink(path);
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      const s = await fsStat(path);
      return s.isFile();
    } catch {
      return false;
    }
  }

  async createSymlink(targetPath: string, linkPath: string): Promise<void> {
    await symlink(targetPath, linkPath);
  }

  async deleteSymlink(linkPath: string): Promise<void> {
    await unlink(linkPath);
  }

  async stat(path: string): Promise<FileSystemStats> {
    const s = await fsStat(path);
    return {
      isFile: s.isFile(),
      isDirectory: s.isDirectory(),
      isSymbolicLink: s.isSymbolicLink(),
      size: s.size,
      modifiedAt: s.mtime,
    };
  }

  async list(directoryPath: string): Promise<string[]> {
    return readdir(directoryPath);
  }

  async copy(source: string, destination: string): Promise<void> {
    await cp(source, destination, { recursive: true });
  }

  async move(source: string, destination: string): Promise<void> {
    await rename(source, destination);
  }
}
