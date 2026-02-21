import { Injectable } from '@nestjs/common';
import {
  WorkExecutionRepository, ReportRepository,
} from '../../domain/index.js';
import type { WorkExecutionId, ReportId } from '../../domain/index.js';
import { QueryResponded } from '@common/events/index.js';
import { AgentService } from '@common/ports/index.js';
import { EventPublisher, UnitOfWork } from '@common/ports/index.js';
import { ApplicationError } from '@common/errors/index.js';
import { tempBasePath, buildPath } from '@common/utils/index.js';
import { FileSystem } from '../../domain/ports/file-system.js';
import { CompensationStack } from '@common/application/compensation-stack.js';

export class WorkExecutionNotFoundError extends ApplicationError {
  constructor(id: WorkExecutionId) {
    super('WORK_EXECUTION_NOT_FOUND', `WorkExecution ${id} not found`);
  }
}

export class NoActiveTaskError extends ApplicationError {
  constructor(workExecutionId: WorkExecutionId) {
    super('NO_ACTIVE_TASK', `WorkExecution ${workExecutionId} has no active task`);
  }
}

export class AgentSessionNotFoundError extends ApplicationError {
  constructor(workExecutionId: WorkExecutionId) {
    super('AGENT_SESSION_NOT_FOUND', `No agent session found for WorkExecution ${workExecutionId}`);
  }
}

export class QueryFailedError extends ApplicationError {
  constructor(workExecutionId: WorkExecutionId, cause: string) {
    super('QUERY_FAILED', `Query failed for WorkExecution ${workExecutionId}: ${cause}`);
  }
}

export interface SendQueryCommand {
  readonly workExecutionId: WorkExecutionId;
}

export interface SendQueryResult {
  readonly response: string;
  readonly tokensUsed?: number;
}

@Injectable()
export class SendQueryUseCase {
  constructor(
    private readonly workExecutionRepository: WorkExecutionRepository,
    private readonly reportRepository: ReportRepository,
    private readonly agentService: AgentService,
    private readonly eventPublisher: EventPublisher,
    private readonly fileSystem: FileSystem,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: SendQueryCommand): Promise<SendQueryResult> {
    // TRY: Load and validate
    const workExecution = await this.workExecutionRepository.findById(command.workExecutionId);
    if (!workExecution) {
      throw new WorkExecutionNotFoundError(command.workExecutionId);
    }

    if (workExecution.isTerminal) {
      throw new WorkExecutionNotFoundError(command.workExecutionId);
    }

    const currentTask = workExecution.currentTask();
    if (!currentTask) {
      throw new NoActiveTaskError(command.workExecutionId);
    }

    const session = await this.agentService.findSessionByWorkExecutionId(workExecution.id);
    if (!session || !session.processId) {
      throw new AgentSessionNotFoundError(command.workExecutionId);
    }

    // Augment query with report instructions if task requires a report
    let query = currentTask.query;
    const report = currentTask.requiresReport()
      ? await this.reportRepository.findById(currentTask.reportId as ReportId)
      : null;

    if (report) {
      const sections = report.outline.sections
        .map((s) => `## ${s.title}\n${s.description}`)
        .join('\n\n');
      query = `${currentTask.query}\n\n---\n[리포트 생성 지시]\n위 작업을 완료한 후, 아래 구조에 맞는 리포트를 마크다운 형식으로 작성하세요.\n\n${sections}`;
    }

    // CONFIRM: Side effects with compensation
    const compensations = new CompensationStack();

    try {
      const queryResult = await this.agentService.sendQuery(workExecution.id, query);

      currentTask.markCompleted();

      // If task requires a report, save the agent's response as the report
      if (report) {
        const reportDir = buildPath(
          tempBasePath('FLOWFLOW_DATA_PATH', 'flowflow-data'),
          'reports',
          workExecution.workflowRunId,
        );
        const reportPath = buildPath(reportDir, `${report.id}.md`);
        try {
          await this.fileSystem.createDirectory(reportDir);
        } catch {
          // directory may already exist
        }
        await this.fileSystem.createFile(reportPath, queryResult.response);
        compensations.push(async () => {
          try { await this.fileSystem.deleteFile(reportPath); } catch { /* best-effort */ }
        });
        report.complete(reportPath, queryResult.response);
      }

      await this.unitOfWork.run(async () => {
        await this.workExecutionRepository.save(workExecution);
        if (report) {
          await this.reportRepository.save(report);
          await this.eventPublisher.publishAll(report.clearDomainEvents());
        }
        await this.eventPublisher.publish(new QueryResponded({
          workExecutionId: workExecution.id,
          workflowRunId: workExecution.workflowRunId,
          taskExecutionId: currentTask.id,
        }));
      });

      return {
        response: queryResult.response,
        tokensUsed: queryResult.tokensUsed,
      };
    } catch (error) {
      // CANCEL: Compensate file system side effects
      await compensations.runAll();

      currentTask.markFailed();
      await this.workExecutionRepository.save(workExecution);

      throw new QueryFailedError(
        command.workExecutionId,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
