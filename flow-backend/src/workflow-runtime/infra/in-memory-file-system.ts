import { FileSystem } from '../domain/ports/file-system.js';
import type { FileSystemStats } from '../domain/ports/file-system.js';

interface FileEntry {
  content: string;
  stats: FileSystemStats;
}

export class InMemoryFileSystem extends FileSystem {
  private readonly files = new Map<string, FileEntry>();
  private readonly directories = new Set<string>();
  private readonly symlinks = new Map<string, string>();

  async createDirectory(path: string): Promise<void> {
    this.directories.add(path);
  }

  async deleteDirectory(path: string): Promise<void> {
    this.directories.delete(path);
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(path + '/')) {
        this.files.delete(filePath);
      }
    }
  }

  async directoryExists(path: string): Promise<boolean> {
    return this.directories.has(path);
  }

  async createFile(path: string, content: string): Promise<void> {
    this.files.set(path, {
      content,
      stats: {
        isFile: true,
        isDirectory: false,
        isSymbolicLink: false,
        size: content.length,
        modifiedAt: new Date(),
      },
    });
  }

  async readFile(path: string): Promise<string> {
    const entry = this.files.get(path);
    if (!entry) {
      throw new Error(`File not found: ${path}`);
    }
    return entry.content;
  }

  async deleteFile(path: string): Promise<void> {
    this.files.delete(path);
  }

  async fileExists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async createSymlink(targetPath: string, linkPath: string): Promise<void> {
    this.symlinks.set(linkPath, targetPath);
  }

  async deleteSymlink(linkPath: string): Promise<void> {
    this.symlinks.delete(linkPath);
  }

  async stat(path: string): Promise<FileSystemStats> {
    if (this.symlinks.has(path)) {
      return {
        isFile: false,
        isDirectory: false,
        isSymbolicLink: true,
        size: 0,
        modifiedAt: new Date(),
      };
    }

    const fileEntry = this.files.get(path);
    if (fileEntry) {
      return { ...fileEntry.stats };
    }

    if (this.directories.has(path)) {
      return {
        isFile: false,
        isDirectory: true,
        isSymbolicLink: false,
        size: 0,
        modifiedAt: new Date(),
      };
    }

    throw new Error(`Path not found: ${path}`);
  }

  async list(directoryPath: string): Promise<string[]> {
    const entries: string[] = [];
    const prefix = directoryPath.endsWith('/') ? directoryPath : directoryPath + '/';

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const relative = filePath.slice(prefix.length);
        const topLevel = relative.split('/')[0];
        if (topLevel && !entries.includes(topLevel)) {
          entries.push(topLevel);
        }
      }
    }

    for (const dirPath of this.directories) {
      if (dirPath.startsWith(prefix)) {
        const relative = dirPath.slice(prefix.length);
        const topLevel = relative.split('/')[0];
        if (topLevel && !entries.includes(topLevel)) {
          entries.push(topLevel);
        }
      }
    }

    for (const linkPath of this.symlinks.keys()) {
      if (linkPath.startsWith(prefix)) {
        const relative = linkPath.slice(prefix.length);
        const topLevel = relative.split('/')[0];
        if (topLevel && !entries.includes(topLevel)) {
          entries.push(topLevel);
        }
      }
    }

    return entries;
  }

  async copy(source: string, destination: string): Promise<void> {
    const fileEntry = this.files.get(source);
    if (fileEntry) {
      this.files.set(destination, {
        content: fileEntry.content,
        stats: {
          ...fileEntry.stats,
          modifiedAt: new Date(),
        },
      });
      return;
    }

    if (this.directories.has(source)) {
      this.directories.add(destination);
      const prefix = source + '/';
      for (const [filePath, entry] of this.files) {
        if (filePath.startsWith(prefix)) {
          const newPath = destination + '/' + filePath.slice(prefix.length);
          this.files.set(newPath, {
            content: entry.content,
            stats: { ...entry.stats, modifiedAt: new Date() },
          });
        }
      }
      return;
    }

    throw new Error(`Source not found: ${source}`);
  }

  async move(source: string, destination: string): Promise<void> {
    await this.copy(source, destination);

    const fileEntry = this.files.get(source);
    if (fileEntry) {
      this.files.delete(source);
      return;
    }

    if (this.directories.has(source)) {
      this.directories.delete(source);
      const prefix = source + '/';
      for (const filePath of this.files.keys()) {
        if (filePath.startsWith(prefix)) {
          this.files.delete(filePath);
        }
      }
    }
  }
}
