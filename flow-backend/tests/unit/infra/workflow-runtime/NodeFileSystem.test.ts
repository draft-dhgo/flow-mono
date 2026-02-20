import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeFileSystem } from '@workflow-runtime/infra/node-file-system.js';

describe('NodeFileSystem', () => {
  let fs: NodeFileSystem;
  let testDir: string;

  beforeEach(async () => {
    fs = new NodeFileSystem();
    testDir = await mkdtemp(join(tmpdir(), 'node-fs-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('createDirectory', () => {
    it('should create a directory', async () => {
      const dirPath = join(testDir, 'new-dir');

      await fs.createDirectory(dirPath);

      expect(await fs.directoryExists(dirPath)).toBe(true);
    });

    it('should create nested directories recursively', async () => {
      const nestedPath = join(testDir, 'a', 'b', 'c');

      await fs.createDirectory(nestedPath);

      expect(await fs.directoryExists(nestedPath)).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      const dirPath = join(testDir, 'existing-dir');

      await fs.createDirectory(dirPath);
      await expect(fs.createDirectory(dirPath)).resolves.not.toThrow();
    });
  });

  describe('deleteDirectory', () => {
    it('should delete a directory and its contents', async () => {
      const dirPath = join(testDir, 'dir-to-delete');
      await fs.createDirectory(dirPath);
      await fs.createFile(join(dirPath, 'file.txt'), 'content');

      await fs.deleteDirectory(dirPath);

      expect(await fs.directoryExists(dirPath)).toBe(false);
    });

    it('should not throw if directory does not exist', async () => {
      const dirPath = join(testDir, 'nonexistent');

      await expect(fs.deleteDirectory(dirPath)).resolves.not.toThrow();
    });
  });

  describe('directoryExists', () => {
    it('should return true for an existing directory', async () => {
      const dirPath = join(testDir, 'existing');
      await fs.createDirectory(dirPath);

      expect(await fs.directoryExists(dirPath)).toBe(true);
    });

    it('should return false for a non-existing directory', async () => {
      const dirPath = join(testDir, 'nonexistent');

      expect(await fs.directoryExists(dirPath)).toBe(false);
    });

    it('should return false for a file path', async () => {
      const filePath = join(testDir, 'file.txt');
      await fs.createFile(filePath, 'content');

      expect(await fs.directoryExists(filePath)).toBe(false);
    });
  });

  describe('createFile', () => {
    it('should create a file with content', async () => {
      const filePath = join(testDir, 'test.txt');

      await fs.createFile(filePath, 'hello world');

      const content = await fs.readFile(filePath);
      expect(content).toBe('hello world');
    });

    it('should overwrite an existing file', async () => {
      const filePath = join(testDir, 'overwrite.txt');
      await fs.createFile(filePath, 'original');

      await fs.createFile(filePath, 'updated');

      const content = await fs.readFile(filePath);
      expect(content).toBe('updated');
    });
  });

  describe('readFile', () => {
    it('should read file content as UTF-8 string', async () => {
      const filePath = join(testDir, 'read-test.txt');
      await fs.createFile(filePath, 'read me');

      const content = await fs.readFile(filePath);

      expect(content).toBe('read me');
    });

    it('should throw for a non-existing file', async () => {
      const filePath = join(testDir, 'nonexistent.txt');

      await expect(fs.readFile(filePath)).rejects.toThrow();
    });
  });

  describe('deleteFile', () => {
    it('should delete an existing file', async () => {
      const filePath = join(testDir, 'delete-me.txt');
      await fs.createFile(filePath, 'content');

      await fs.deleteFile(filePath);

      expect(await fs.fileExists(filePath)).toBe(false);
    });

    it('should throw for a non-existing file', async () => {
      const filePath = join(testDir, 'nonexistent.txt');

      await expect(fs.deleteFile(filePath)).rejects.toThrow();
    });
  });

  describe('fileExists', () => {
    it('should return true for an existing file', async () => {
      const filePath = join(testDir, 'exists.txt');
      await fs.createFile(filePath, 'content');

      expect(await fs.fileExists(filePath)).toBe(true);
    });

    it('should return false for a non-existing file', async () => {
      const filePath = join(testDir, 'nonexistent.txt');

      expect(await fs.fileExists(filePath)).toBe(false);
    });

    it('should return false for a directory path', async () => {
      const dirPath = join(testDir, 'some-dir');
      await fs.createDirectory(dirPath);

      expect(await fs.fileExists(dirPath)).toBe(false);
    });
  });

  describe('createSymlink', () => {
    it('should create a symbolic link pointing to the target', async () => {
      const targetPath = join(testDir, 'target.txt');
      const linkPath = join(testDir, 'link.txt');
      await fs.createFile(targetPath, 'symlink content');

      await fs.createSymlink(targetPath, linkPath);

      const content = await fs.readFile(linkPath);
      expect(content).toBe('symlink content');
    });
  });

  describe('deleteSymlink', () => {
    it('should delete a symbolic link without affecting the target', async () => {
      const targetPath = join(testDir, 'target.txt');
      const linkPath = join(testDir, 'link.txt');
      await fs.createFile(targetPath, 'target content');
      await fs.createSymlink(targetPath, linkPath);

      await fs.deleteSymlink(linkPath);

      expect(await fs.fileExists(linkPath)).toBe(false);
      expect(await fs.fileExists(targetPath)).toBe(true);
      const content = await fs.readFile(targetPath);
      expect(content).toBe('target content');
    });
  });

  describe('stat', () => {
    it('should return stats for a file', async () => {
      const filePath = join(testDir, 'stat-file.txt');
      await fs.createFile(filePath, 'stat content');

      const stats = await fs.stat(filePath);

      expect(stats.isFile).toBe(true);
      expect(stats.isDirectory).toBe(false);
      expect(stats.isSymbolicLink).toBe(false);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.modifiedAt).toBeInstanceOf(Date);
    });

    it('should return stats for a directory', async () => {
      const dirPath = join(testDir, 'stat-dir');
      await fs.createDirectory(dirPath);

      const stats = await fs.stat(dirPath);

      expect(stats.isFile).toBe(false);
      expect(stats.isDirectory).toBe(true);
      expect(stats.isSymbolicLink).toBe(false);
      expect(stats.modifiedAt).toBeInstanceOf(Date);
    });

    it('should throw for a non-existing path', async () => {
      const nonexistent = join(testDir, 'nonexistent');

      await expect(fs.stat(nonexistent)).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('should list entries in a directory', async () => {
      await fs.createFile(join(testDir, 'a.txt'), 'a');
      await fs.createFile(join(testDir, 'b.txt'), 'b');
      await fs.createDirectory(join(testDir, 'subdir'));

      const entries = await fs.list(testDir);

      expect(entries).toContain('a.txt');
      expect(entries).toContain('b.txt');
      expect(entries).toContain('subdir');
    });

    it('should return an empty array for an empty directory', async () => {
      const emptyDir = join(testDir, 'empty');
      await fs.createDirectory(emptyDir);

      const entries = await fs.list(emptyDir);

      expect(entries).toEqual([]);
    });
  });

  describe('copy', () => {
    it('should copy a file to a new location', async () => {
      const src = join(testDir, 'copy-src.txt');
      const dest = join(testDir, 'copy-dest.txt');
      await fs.createFile(src, 'copy content');

      await fs.copy(src, dest);

      expect(await fs.fileExists(dest)).toBe(true);
      expect(await fs.readFile(dest)).toBe('copy content');
      // source should still exist
      expect(await fs.fileExists(src)).toBe(true);
    });

    it('should copy a directory recursively', async () => {
      const srcDir = join(testDir, 'src-dir');
      const destDir = join(testDir, 'dest-dir');
      await fs.createDirectory(srcDir);
      await fs.createFile(join(srcDir, 'file.txt'), 'nested content');
      await fs.createDirectory(join(srcDir, 'sub'));
      await fs.createFile(join(srcDir, 'sub', 'deep.txt'), 'deep content');

      await fs.copy(srcDir, destDir);

      expect(await fs.directoryExists(destDir)).toBe(true);
      expect(await fs.readFile(join(destDir, 'file.txt'))).toBe('nested content');
      expect(await fs.readFile(join(destDir, 'sub', 'deep.txt'))).toBe('deep content');
    });
  });

  describe('move', () => {
    it('should move a file to a new location', async () => {
      const src = join(testDir, 'move-src.txt');
      const dest = join(testDir, 'move-dest.txt');
      await fs.createFile(src, 'move content');

      await fs.move(src, dest);

      expect(await fs.fileExists(dest)).toBe(true);
      expect(await fs.readFile(dest)).toBe('move content');
      expect(await fs.fileExists(src)).toBe(false);
    });

    it('should move a directory to a new location', async () => {
      const srcDir = join(testDir, 'move-src-dir');
      const destDir = join(testDir, 'move-dest-dir');
      await fs.createDirectory(srcDir);
      await fs.createFile(join(srcDir, 'file.txt'), 'moved content');

      await fs.move(srcDir, destDir);

      expect(await fs.directoryExists(destDir)).toBe(true);
      expect(await fs.readFile(join(destDir, 'file.txt'))).toBe('moved content');
      expect(await fs.directoryExists(srcDir)).toBe(false);
    });
  });
});
