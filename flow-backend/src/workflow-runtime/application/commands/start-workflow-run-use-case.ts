import { Injectable } from '@nestjs/common';
import {
  WorkflowRunRepository, WorkflowSpaceRepository, WorkTreeRepository,
  WorkflowRunStatus, WorkflowSpace, WorkTree,
} from '../../domain/index.js';
import { FileSystem } from '../../domain/ports/file-system.js';
import type { WorkflowId } from '@common/ids/index.js';
import { WorkflowConfigReader, GitReader, GitService } from '@common/ports/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';
import { WorkflowRunFactory } from '../factories/workflow-run-factory.js';
import { WorkspacePathFactory } from '../factories/workspace-path-factory.js';

export class WorkflowNotFoundError extends ApplicationError {
  constructor(workflowId: WorkflowId) {
    super('WORKFLOW_NOT_FOUND', `Workflow ${workflowId} not found`);
  }
}

export class WorkflowNotActiveError extends ApplicationError {
  constructor(workflowId: WorkflowId) {
    super('WORKFLOW_NOT_ACTIVE', `Workflow ${workflowId} is not in ACTIVE status`);
  }
}

export class InvalidIssueKeyError extends ApplicationError {
  constructor(issueKey: string) {
    super('INVALID_ISSUE_KEY', `Invalid issue key format: "${issueKey}"`);
  }
}

export class WorkflowRunStartFailedError extends ApplicationError {
  constructor(reason: string) {
    super('WORKFLOW_RUN_START_FAILED', `Failed to start workflow run: ${reason}`);
  }
}

export class MissingSeedValuesError extends ApplicationError {
  constructor(missingKeys: string[]) {
    super('MISSING_SEED_VALUES', `Missing seed values for keys: ${missingKeys.join(', ')}`);
  }
}

export interface StartWorkflowRunCommand {
  readonly workflowId: WorkflowId;
  readonly issueKey: string;
  readonly seedValues?: Record<string, string>;
}

export interface StartWorkflowRunResult {
  readonly workflowRunId: string;
  readonly status: WorkflowRunStatus;
}

@Injectable()
export class StartWorkflowRunUseCase {
  constructor(
    private readonly workflowConfigReader: WorkflowConfigReader,
    private readonly workflowRunFactory: WorkflowRunFactory,
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly workflowSpaceRepository: WorkflowSpaceRepository,
    private readonly workTreeRepository: WorkTreeRepository,
    private readonly fileSystem: FileSystem,
    private readonly gitReader: GitReader,
    private readonly gitService: GitService,
    private readonly workspacePathFactory: WorkspacePathFactory,
  ) {}

  async execute(command: StartWorkflowRunCommand): Promise<StartWorkflowRunResult> {
    const workflow = await this.workflowConfigReader.findById(command.workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(command.workflowId);
    }

    if (workflow.status !== 'ACTIVE') {
      throw new WorkflowNotActiveError(command.workflowId);
    }

    try {
      const trimmedKey = command.issueKey.trim();
      if (!/^[A-Z][A-Z0-9]+-\d+$/.test(trimmedKey)) {
        throw new InvalidIssueKeyError(command.issueKey);
      }

      if (workflow.seedKeys.length > 0) {
        const provided = command.seedValues ?? {};
        const missingKeys = [...workflow.seedKeys].filter(
          (key) => !(key in provided) || provided[key] === '',
        );
        if (missingKeys.length > 0) {
          throw new MissingSeedValuesError(missingKeys);
        }
      }

      const { run } = this.workflowRunFactory.build(workflow, trimmedKey, command.seedValues ?? {});
      run.start();

      // 브랜치 전략 템플릿에서 실제 브랜치명 생성
      const resolvedBranchName = workflow.branchStrategy.replace(
        '{issueKey}',
        command.issueKey,
      );

      // WorkflowSpace 생성
      const workflowSpacePath = this.workspacePathFactory.workflowSpacePath(run.id);
      await this.fileSystem.createDirectory(workflowSpacePath);

      const workflowSpace = WorkflowSpace.create({
        workflowRunId: run.id,
        path: workflowSpacePath,
      });
      await this.workflowSpaceRepository.save(workflowSpace);

      // WorkTree 생성 (git ref pool의 각 항목에 대해)
      const gitIds = run.gitRefPool.map((ref) => ref.gitId);
      if (gitIds.length > 0) {
        const gitInfos = await this.gitReader.findByIds(gitIds);
        for (const gitRef of run.gitRefPool) {
          const gitInfo = gitInfos.find((g) => g.id === gitRef.gitId);
          if (!gitInfo) continue;

          const workTreePath = this.workspacePathFactory.workTreePath(run.id, gitRef.gitId);

          // 원격 정보 최신화 및 기존 브랜치 충돌 처리
          await this.gitService.fetch(gitInfo.localPath);
          const exists = await this.gitService.branchExists(gitInfo.localPath, resolvedBranchName);
          if (exists) {
            try {
              await this.gitService.removeWorktreeForBranch(gitInfo.localPath, resolvedBranchName);
            } catch {
              // 기존 worktree가 없으면 무시
            }
            await this.gitService.deleteBranch(gitInfo.localPath, resolvedBranchName);
          }

          await this.gitService.createWorktree({
            repoPath: gitInfo.localPath,
            worktreePath: workTreePath,
            baseBranch: gitRef.baseBranch,
            newBranchName: resolvedBranchName,
          });

          // 에이전트의 원격 푸시 차단
          await this.gitService.installPrePushHook(workTreePath);
          // upstream 트래킹 해제 — 새 브랜치가 원격 베이스를 추적하지 않도록
          await this.gitService.unsetUpstream(workTreePath, resolvedBranchName);

          const workTree = WorkTree.create({
            gitId: gitRef.gitId,
            workflowRunId: run.id,
            path: workTreePath,
            branch: gitRef.baseBranch,
          });
          await this.workTreeRepository.save(workTree);
        }
      }

      await this.workflowRunRepository.save(run);

      const allEvents = run.clearDomainEvents();
      await this.eventPublisher.publishAll(allEvents);

      return {
        workflowRunId: run.id,
        status: run.status,
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw new WorkflowRunStartFailedError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
