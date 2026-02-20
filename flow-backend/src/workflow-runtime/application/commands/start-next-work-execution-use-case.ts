import { Injectable } from '@nestjs/common';
import {
  WorkflowRunRepository, WorkExecutionRepository,
  WorkflowSpaceRepository, ReportRepository, WorkTreeRepository,
  WorkSpace,
} from '../../domain/index.js';
import type { WorkflowRunId } from '../../domain/index.js';
import { WorkflowRunStatus } from '../../domain/index.js';
import { SymLink, LinkType } from '../../domain/value-objects/index.js';
import { FileSystem } from '../../domain/ports/file-system.js';
import { AgentService, McpServerReader } from '@common/ports/index.js';
import type { McpServerConfig } from '@common/ports/index.js';
import { EventPublisher } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';
import { buildPath } from '@common/utils/index.js';
import { WorkExecutionFactory } from '../factories/work-execution-factory.js';
import { WorkspacePathFactory } from '../factories/workspace-path-factory.js';

export class WorkflowRunNotFoundError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_NOT_FOUND', `WorkflowRun ${id} not found`);
  }
}

export class WorkflowRunNotActiveError extends ApplicationError {
  constructor(id: WorkflowRunId) {
    super('WORKFLOW_RUN_NOT_ACTIVE', `WorkflowRun ${id} is not in a runnable state`);
  }
}

export class WorkExecutionNotFoundError extends ApplicationError {
  constructor(id: string) {
    super('WORK_EXECUTION_NOT_FOUND', `WorkExecution ${id} not found`);
  }
}

export class WorkflowSpaceNotFoundError extends ApplicationError {
  constructor(workflowRunId: WorkflowRunId) {
    super('WORKFLOW_SPACE_NOT_FOUND', `WorkflowSpace not found for WorkflowRun ${workflowRunId}`);
  }
}

export interface StartNextWorkExecutionCommand {
  readonly workflowRunId: WorkflowRunId;
}

export interface StartNextWorkExecutionResult {
  readonly workExecutionId: string | null;
  readonly isComplete: boolean;
}

@Injectable()
export class StartNextWorkExecutionUseCase {
  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workExecutionRepository: WorkExecutionRepository,
    private readonly reportRepository: ReportRepository,
    private readonly workflowSpaceRepository: WorkflowSpaceRepository,
    private readonly workTreeRepository: WorkTreeRepository,
    private readonly mcpServerReader: McpServerReader,
    private readonly agentService: AgentService,
    private readonly eventPublisher: EventPublisher,
    private readonly workExecutionFactory: WorkExecutionFactory,
    private readonly workspacePathFactory: WorkspacePathFactory,
    private readonly fileSystem: FileSystem,
  ) {}

  async execute(command: StartNextWorkExecutionCommand): Promise<StartNextWorkExecutionResult> {
    const run = await this.workflowRunRepository.findById(command.workflowRunId);
    if (!run) {
      throw new WorkflowRunNotFoundError(command.workflowRunId);
    }

    if (run.status !== WorkflowRunStatus.RUNNING) {
      return { workExecutionId: null, isComplete: run.isTerminal() };
    }

    const currentConfig = run.getWorkNodeConfig(run.currentWorkIndex);
    if (!currentConfig) {
      return { workExecutionId: null, isComplete: true };
    }

    // Lazy WorkExecution 생성: 기존 ID가 있으면 로드, 없으면 config에서 생성
    const existingId = run.currentWorkExecutionId;
    let workExecution;

    if (existingId) {
      const existing = await this.workExecutionRepository.findById(existingId);
      if (!existing) {
        throw new WorkExecutionNotFoundError(existingId);
      }
      workExecution = existing;
    } else {
      const { workExecution: we, reports } = this.workExecutionFactory.buildFromConfig(
        run.id, run.workflowId, currentConfig,
      );
      workExecution = we;
      run.addWorkExecution(we.id);
      await this.workExecutionRepository.save(we);
      for (const report of reports) {
        await this.reportRepository.save(report);
      }
    }

    // MCP 설정: WorkNodeConfig의 mcpServerRefConfigs에서 해석
    const mcpServerConfigs: McpServerConfig[] = [];
    const mcpServerIds = currentConfig.mcpServerRefConfigs.map((r) => r.mcpServerId);
    if (mcpServerIds.length > 0) {
      const mcpServers = await this.mcpServerReader.findByIds(mcpServerIds);
      for (const server of mcpServers) {
        const ref = currentConfig.mcpServerRefConfigs.find((r) => r.mcpServerId === server.id);
        const env = ref
          ? { ...server.env, ...ref.envOverrides }
          : { ...server.env };
        mcpServerConfigs.push({
          name: server.name,
          command: server.command,
          args: [...server.args],
          env,
          transportType: server.transportType,
          url: server.url,
        });
      }
    }

    const workflowSpace = await this.workflowSpaceRepository.findByWorkflowRunId(run.id);
    if (!workflowSpace) {
      throw new WorkflowSpaceNotFoundError(run.id);
    }

    // WorkSpace 생성: workspaces/<workExecutionId> 디렉토리 + symlinks
    const workSpacePath = this.workspacePathFactory.workSpacePath(run.id, workExecution.id);
    await this.fileSystem.createDirectory(workSpacePath);

    const workSpace = WorkSpace.create({
      workExecutionId: workExecution.id,
      path: workSpacePath,
    });

    // WorkTree symlink 생성
    const gitRefConfigs = currentConfig.gitRefConfigs;
    if (gitRefConfigs.length > 0) {
      const workTrees = await this.workTreeRepository.findByWorkflowRunId(run.id);
      for (const gitRef of gitRefConfigs) {
        const workTree = workTrees.find((wt) => wt.gitId === gitRef.gitId);
        if (!workTree) continue;

        const linkPath = buildPath(workSpacePath, gitRef.gitId);
        await this.fileSystem.createSymlink(workTree.path, linkPath);

        const symLink = SymLink.create(LinkType.GIT_WORKTREE, gitRef.gitId, workTree.path, linkPath);
        workSpace.addLink(symLink);
      }
    }

    // Report file symlink 생성: 이전 Work의 리포트를 workspace에 심링크
    const reportFileRefs = currentConfig.reportFileRefs;
    if (reportFileRefs.length > 0) {
      const reportsDir = buildPath(workSpacePath, 'reports');
      await this.fileSystem.createDirectory(reportsDir);

      for (const sourceSequence of reportFileRefs) {
        const sourceWorkExecutionId = run.workExecutionIds[sourceSequence];
        if (!sourceWorkExecutionId) continue;

        const reports = await this.reportRepository.findByWorkExecutionId(sourceWorkExecutionId);
        for (const report of reports) {
          if (report.status !== 'COMPLETED' || !report.filePath) continue;

          const fileName = report.filePath.split('/').pop() ?? `report-${report.id}`;
          const sourceDir = buildPath(reportsDir, `work-${sourceSequence}`);
          await this.fileSystem.createDirectory(sourceDir);
          const linkPath = buildPath(sourceDir, fileName);
          await this.fileSystem.createSymlink(report.filePath, linkPath);

          const symLink = SymLink.create(
            LinkType.SHARED_RESOURCE, sourceWorkExecutionId, report.filePath, linkPath,
          );
          workSpace.addLink(symLink);
        }
      }
    }

    workflowSpace.addWorkSpace(workSpace);
    await this.workflowSpaceRepository.save(workflowSpace);

    const sessionInfo = await this.agentService.startSession({
      workExecutionId: workExecution.id,
      workflowRunId: run.id,
      model: currentConfig.model,
      workspacePath: workSpacePath,
      mcpServerConfigs,
    });
    if (!sessionInfo.processId) {
      throw new ApplicationError(
        'AGENT_SESSION_NOT_ASSIGNED',
        'Agent session for WorkExecution ' + workExecution.id + ' was not assigned',
      );
    }

    await this.workflowRunRepository.save(run);

    const allEvents = [
      ...run.clearDomainEvents(),
      ...workExecution.clearDomainEvents(),
    ];
    await this.eventPublisher.publishAll(allEvents);

    return { workExecutionId: workExecution.id, isComplete: false };
  }
}
