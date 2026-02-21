import { Injectable, Inject } from '@nestjs/common';
import { join } from 'node:path';
import { GitId, McpServerId, WorkspaceId } from '@common/ids/index.js';
import {
  EventPublisher,
  AgentService,
  GitService,
  GitReader,
  McpServerReader,
  WorkTreeRepository,
} from '@common/ports/index.js';
import type { McpServerConfig } from '@common/ports/index.js';
import { FileSystem } from '@common/ports/file-system.js';
import { WorkspaceRepository } from '../../domain/ports/workspace-repository.js';
import { Workspace } from '../../domain/entities/workspace.js';
import { WorkspaceGitRef } from '../../domain/value-objects/workspace-git-ref.js';
import { WorkspacePurpose } from '../../domain/value-objects/workspace-purpose.js';
import { AdhocWorkspacePathFactory } from '../factories/workspace-path-factory.js';
import { buildWorkflowBuilderSystemPrompt } from '../workflow-builder-prompt.js';

export interface CreateWorkspaceCommand {
  readonly name: string;
  readonly model: string;
  readonly gitRefs: { gitId: string; baseBranch: string; branchName?: string }[];
  readonly mcpServerRefs: { mcpServerId: string; envOverrides: Record<string, string> }[];
  readonly purpose?: WorkspacePurpose;
}

@Injectable()
export class CreateWorkspaceUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    @Inject(GitReader) private readonly gitReader: GitReader,
    @Inject(GitService) private readonly gitService: GitService,
    @Inject(AgentService) private readonly agentService: AgentService,
    @Inject(EventPublisher) private readonly eventPublisher: EventPublisher,
    private readonly fileSystem: FileSystem,
    private readonly pathFactory: AdhocWorkspacePathFactory,
    @Inject(McpServerReader) private readonly mcpServerReader: McpServerReader,
    private readonly workTreeRepository: WorkTreeRepository,
  ) {}

  async execute(command: CreateWorkspaceCommand): Promise<{ workspaceId: string }> {
    const purpose = command.purpose ?? WorkspacePurpose.GENERAL;
    const isBuilder = purpose === WorkspacePurpose.WORKFLOW_BUILDER;

    // 1. Build WorkspaceGitRef VOs
    const gitRefs = command.gitRefs.map((ref) =>
      WorkspaceGitRef.create({
        gitId: GitId.create(ref.gitId),
        baseBranch: ref.baseBranch,
        branchName: isBuilder ? ref.baseBranch : (ref.branchName ?? ref.baseBranch),
      }),
    );

    // 2. Create workspace entity
    const workspaceId = WorkspaceId.generate();
    const workspacePath = this.pathFactory.workspacePath(workspaceId);

    const workspace = Workspace.create({
      id: workspaceId,
      name: command.name,
      model: command.model,
      gitRefs,
      mcpServerRefs: command.mcpServerRefs,
      path: workspacePath,
      purpose,
    });

    // 3. Create workspace directory
    await this.fileSystem.createDirectory(workspacePath);

    // 4. Create git worktrees
    const gitIds = gitRefs.map((ref) => ref.gitId);
    const gitInfos = gitIds.length > 0 ? await this.gitReader.findByIds(gitIds) : [];

    for (const gitRef of gitRefs) {
      const gitInfo = gitInfos.find((g) => g.id === gitRef.gitId);
      if (!gitInfo) continue;

      if (isBuilder) {
        // WORKFLOW_BUILDER: use shared read-only worktrees
        const existingTrees = await this.workTreeRepository.findByGitId(String(gitRef.gitId));
        const sharedTree = existingTrees.find((t) => t.branch === gitRef.baseBranch);

        if (sharedTree) {
          // Reuse existing worktree via symlink
          const linkPath = join(workspacePath, String(gitRef.gitId));
          await this.fileSystem.createSymlink(sharedTree.path, linkPath);
        } else {
          // Create new detached (read-only) worktree
          const readOnlyTreePath = this.pathFactory.workTreePath(workspaceId, gitRef.gitId);
          await this.gitService.fetch(gitInfo.localPath);
          await this.gitService.createReadOnlyWorktree(
            gitInfo.localPath,
            readOnlyTreePath,
            gitRef.baseBranch,
          );
          const linkPath = join(workspacePath, String(gitRef.gitId));
          await this.fileSystem.createSymlink(readOnlyTreePath, linkPath);
        }
      } else {
        // GENERAL: create new branch + worktree
        const workTreePath = this.pathFactory.workTreePath(workspaceId, gitRef.gitId);

        // Fetch latest remote
        await this.gitService.fetch(gitInfo.localPath);

        // Handle existing branch conflict
        const exists = await this.gitService.branchExists(gitInfo.localPath, gitRef.branchName);
        if (exists) {
          try {
            await this.gitService.removeWorktreeForBranch(gitInfo.localPath, gitRef.branchName);
          } catch {
            // ignore
          }
          await this.gitService.deleteBranch(gitInfo.localPath, gitRef.branchName);
        }

        // Create worktree
        await this.gitService.createWorktree({
          repoPath: gitInfo.localPath,
          worktreePath: workTreePath,
          baseBranch: gitRef.baseBranch,
          newBranchName: gitRef.branchName,
        });

        // Git safety: install pre-push hook + unset upstream
        await this.gitService.installPrePushHook(workTreePath);
        await this.gitService.unsetUpstream(workTreePath, gitRef.branchName);

        // Create symlink in workspace directory
        const linkPath = join(workspacePath, String(gitRef.gitId));
        await this.fileSystem.createSymlink(workTreePath, linkPath);
      }
    }

    // 5. Build MCP server configs
    const mcpServerIds = command.mcpServerRefs.map((ref) => McpServerId.create(ref.mcpServerId));
    const mcpServers =
      mcpServerIds.length > 0
        ? await this.mcpServerReader.findByIds(mcpServerIds)
        : [];

    const mcpServerConfigs: McpServerConfig[] = command.mcpServerRefs.map((ref) => {
      const server = mcpServers.find((s) => String(s.id) === ref.mcpServerId);
      return {
        name: server?.name ?? ref.mcpServerId,
        command: server?.command ?? '',
        args: server ? [...server.args] : [],
        env: { ...(server?.env ?? {}), ...ref.envOverrides },
        transportType: server?.transportType ?? 'STDIO',
        url: server?.url ?? null,
      };
    });

    // 6. Build system prompt for builder sessions
    let systemPrompt: string | undefined;
    if (isBuilder) {
      systemPrompt = buildWorkflowBuilderSystemPrompt(
        gitInfos.map((g) => ({ id: String(g.id), url: g.url, branches: [] })),
        mcpServers.map((m) => ({ id: String(m.id), name: m.name })),
        ['claude-sonnet-4-5-20250929', 'claude-opus-4-6', 'claude-haiku-4-5-20251001'],
      );
    }

    // 7. Save workspace (without agent session — will be assigned async)
    await this.workspaceRepository.save(workspace);
    await this.eventPublisher.publishAll(workspace.clearDomainEvents());

    // 8. Start agent session async (fire-and-forget from use case perspective)
    // Session startup can take 30-60s; we return immediately so the HTTP response is fast.
    this.startAgentSessionAsync(workspaceId, command.model, workspacePath, mcpServerConfigs, systemPrompt)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[CreateWorkspace] Agent session startup failed for ${workspaceId}: ${message}`);
      });

    return { workspaceId };
  }

  private async startAgentSessionAsync(
    workspaceId: WorkspaceId,
    model: string,
    workspacePath: string,
    mcpServerConfigs: McpServerConfig[],
    systemPrompt: string | undefined,
  ): Promise<void> {
    const sessionInfo = await this.agentService.startSessionForWorkspace({
      workspaceId,
      model,
      workspacePath,
      mcpServerConfigs,
      systemPrompt,
    });

    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (workspace) {
      workspace.assignAgentSession(sessionInfo.sessionId);
      await this.workspaceRepository.save(workspace);
    }
  }
}
