export interface RegisterGitParams {
  readonly url: string;
  readonly localPath: string;
}

export interface RegisterGitResult {
  readonly gitId: string;
  readonly url: string;
  readonly localPath: string;
}

/**
 * Facade for git repository operations — used by mcp-gateway to avoid cross-domain imports.
 */
export abstract class GitFacade {
  abstract list(): Promise<ReadonlyArray<Record<string, unknown>>>;
  abstract getById(gitId: string): Promise<Record<string, unknown> | null>;
  abstract register(params: RegisterGitParams): Promise<RegisterGitResult>;
  abstract delete(gitId: string): Promise<void>;
}
