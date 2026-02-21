import { Injectable } from '@nestjs/common';
import {
  WorkflowRunRepository, WorkflowSpaceRepository, WorkTreeRepository,
  WorkflowRunStatus, WorkflowSpace, WorkTree,
} from '../../domain/index.js';
import { FileSystem } from '../../domain/ports/file-system.js';
import type { WorkflowId } from '@common/ids/index.js';
import { WorkflowConfigReader, GitReader, GitService } from '@common/ports/index.js';
import { EventPublisher, UnitOfWork } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';
import { WorkflowRunFactory } from '../factories/workflow-run-factory.js';
import { WorkspacePathFactory } from '../factories/workspace-path-factory.js';
import { CompensationStack } from '@common/application/compensation-stack.js';

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
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: StartWorkflowRunCommand): Promise<StartWorkflowRunResult> {
    // TRY: Validate inputs
    const workflow = await this.workflowConfigReader.findById(command.workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(command.workflowId);
    }

    if (workflow.status !== 'ACTIVE') {
      throw new WorkflowNotActiveError(command.workflowId);
    }

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

    // TRY: Create domain entities in memory
    const { run } = this.workflowRunFactory.build(workflow, trimmedKey, command.seedValues ?? {});
    const resolvedBranchName = workflow.branchStrategy.replace('{issueKey}', command.issueKey);
    const workflowSpacePath = this.workspacePathFactory.workflowSpacePath(run.id);
    const workflowSpace = WorkflowSpace.create({ workflowRunId: run.id, path: workflowSpacePath });

    // TRY: Reserve entities in DB (INITIALIZED state)
    await this.unitOfWork.run(async () => {
      await this.workflowRunRepository.save(run);
      await this.workflowSpaceRepository.save(workflowSpace);
    });

    // CONFIRM: Execute side effects with compensation
    const compensations = new CompensationStack();

    try {
      await this.fileSystem.createDirectory(workflowSpacePath);
      compensations.push(async () => {
        try { await this.fileSystem.deleteDirectory(workflowSpacePath); } catch { /* best-effort */ }
      });

      // WorkTree creation (git ref pool)
      const gitIds = run.gitRefPool.map((ref) => ref.gitId);
      if (gitIds.length > 0) {
        const gitInfos = await this.gitReader.findByIds(gitIds);
        for (const gitRef of run.gitRefPool) {
          const gitInfo = gitInfos.find((g) => g.id === gitRef.gitId);
          if (!gitInfo) continue;

          const workTreePath = this.workspacePathFactory.workTreePath(run.id, gitRef.gitId);

          await this.gitService.fetch(gitInfo.localPath);
          const exists = await this.gitService.branchExists(gitInfo.localPath, resolvedBranchName);
          if (exists) {
            try {
              await this.gitService.removeWorktreeForBranch(gitInfo.localPath, resolvedBranchName);
            } catch {
              // existing worktree may not exist
            }
            await this.gitService.deleteBranch(gitInfo.localPath, resolvedBranchName);
          }

          await this.gitService.createWorktree({
            repoPath: gitInfo.localPath,
            worktreePath: workTreePath,
            baseBranch: gitRef.baseBranch,
            newBranchName: resolvedBranchName,
          });
          compensations.push(async () => {
            try {
              await this.gitService.removeWorktreeForBranch(gitInfo.localPath, resolvedBranchName);
            } catch { /* best-effort */ }
          });

          await this.gitService.installPrePushHook(workTreePath);
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

      // Transition to RUNNING
      run.start();

      await this.unitOfWork.run(async () => {
        await this.workflowRunRepository.save(run);
        await this.eventPublisher.publishAll(run.clearDomainEvents());
      });

      return {
        workflowRunId: run.id,
        status: run.status,
      };
    } catch (error) {
      // CANCEL: Compensate side effects
      await compensations.runAll();

      try {
        run.cancel('Start failed: ' + (error instanceof Error ? error.message : String(error)));
        await this.workflowRunRepository.save(run);
      } catch {
        // best-effort cancel save
      }

      if (error instanceof ApplicationError) throw error;
      throw new WorkflowRunStartFailedError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
