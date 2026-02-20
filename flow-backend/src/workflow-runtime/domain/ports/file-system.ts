export interface FileSystemStats {
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  size: number;
  modifiedAt: Date;
}

export abstract class FileSystem {
  abstract createDirectory(path: string): Promise<void>;
  abstract deleteDirectory(path: string): Promise<void>;
  abstract directoryExists(path: string): Promise<boolean>;
  abstract createFile(path: string, content: string): Promise<void>;
  abstract readFile(path: string): Promise<string>;
  abstract deleteFile(path: string): Promise<void>;
  abstract fileExists(path: string): Promise<boolean>;
  abstract createSymlink(targetPath: string, linkPath: string): Promise<void>;
  abstract deleteSymlink(linkPath: string): Promise<void>;
  abstract stat(path: string): Promise<FileSystemStats>;
  abstract list(directoryPath: string): Promise<string[]>;
  abstract copy(source: string, destination: string): Promise<void>;
  abstract move(source: string, destination: string): Promise<void>;
}
