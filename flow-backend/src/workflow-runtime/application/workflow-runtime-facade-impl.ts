import { Injectable, Inject } from '@nestjs/common';
import type {
  WorkflowRuntimeFacade,
  StartWorkflowRunParams,
  StartWorkflowRunResult,
  ResumeWorkflowRunParams,
  CancelWorkflowRunParams,
} from '@common/ports/index.js';
import { WorkflowId, WorkflowRunId } from '@common/ids/index.js';
import { WorkflowRunRepository } from '../domain/ports/workflow-run-repository.js';
import { CheckpointRepository } from '../domain/ports/checkpoint-repository.js';
import type { WorkflowRun } from '../domain/entities/workflow-run.js';
import { CheckpointId } from '../domain/value-objects/index.js';
import { StartWorkflowRunUseCase } from './commands/start-workflow-run-use-case.js';
import { PauseWorkflowRunUseCase } from './commands/pause-workflow-run-use-case.js';
import { ResumeWorkflowRunUseCase } from './commands/resume-workflow-run-use-case.js';
import { CancelWorkflowRunUseCase } from './commands/cancel-workflow-run-use-case.js';
import { DeleteWorkflowRunUseCase } from './commands/delete-workflow-run-use-case.js';

@Injectable()
export class WorkflowRuntimeFacadeImpl implements WorkflowRuntimeFacade {
  constructor(
    @Inject(WorkflowRunRepository) private readonly workflowRunRepository: WorkflowRunRepository,
    @Inject(CheckpointRepository) private readonly checkpointRepository: CheckpointRepository,
    private readonly startUseCase: StartWorkflowRunUseCase,
    private readonly pauseUseCase: PauseWorkflowRunUseCase,
    private readonly resumeUseCase: ResumeWorkflowRunUseCase,
    private readonly cancelUseCase: CancelWorkflowRunUseCase,
    private readonly deleteUseCase: DeleteWorkflowRunUseCase,
  ) {}

  async listRuns(): Promise<ReadonlyArray<Record<string, unknown>>> {
    const runs = await this.workflowRunRepository.findAll();
    return runs.map((r) => this.serialize(r));
  }

  async getRunSummary(): Promise<Record<string, unknown>> {
    const runs = await this.workflowRunRepository.findAll();
    const count = (status: string) => runs.filter((r) => r.status === status).length;
    return {
      initialized: count('INITIALIZED'),
      running: count('RUNNING'),
      paused: count('PAUSED'),
      awaiting: count('AWAITING'),
      completed: count('COMPLETED'),
      cancelled: count('CANCELLED'),
    };
  }

  async getRunById(workflowRunId: string): Promise<Record<string, unknown> | null> {
    const run = await this.workflowRunRepository.findById(WorkflowRunId.create(workflowRunId));
    if (!run) return null;
    return this.serialize(run);
  }

  async startRun(params: StartWorkflowRunParams): Promise<StartWorkflowRunResult> {
    const result = await this.startUseCase.execute({
      workflowId: WorkflowId.create(params.workflowId),
      issueKey: params.issueKey,
    });
    return { workflowRunId: result.workflowRunId, status: result.status };
  }

  async pauseRun(workflowRunId: string): Promise<void> {
    await this.pauseUseCase.execute({ workflowRunId: WorkflowRunId.create(workflowRunId) });
  }

  async resumeRun(params: ResumeWorkflowRunParams): Promise<void> {
    await this.resumeUseCase.execute({
      workflowRunId: WorkflowRunId.create(params.workflowRunId),
      checkpointId: params.checkpointId ? CheckpointId.create(params.checkpointId) : undefined,
    });
  }

  async cancelRun(params: CancelWorkflowRunParams): Promise<void> {
    await this.cancelUseCase.execute({
      workflowRunId: WorkflowRunId.create(params.workflowRunId),
      reason: params.reason,
    });
  }

  async deleteRun(workflowRunId: string): Promise<void> {
    await this.deleteUseCase.execute({ workflowRunId: WorkflowRunId.create(workflowRunId) });
  }

  private serialize(run: WorkflowRun): Record<string, unknown> {
    return {
      id: run.id,
      workflowId: run.workflowId,
      issueKey: run.issueKey,
      status: run.status,
      currentWorkIndex: run.currentWorkIndex,
      totalWorkCount: run.totalWorkCount,
      cancelledAtWorkIndex: run.cancelledAtWorkIndex,
      cancellationReason: run.cancellationReason,
      restoredToCheckpoint: run.restoredToCheckpoint,
      workExecutionIds: run.workExecutionIds.map((id) => id as string),
      gitRefPool: run.gitRefPool.map((r) => ({ gitId: r.gitId, baseBranch: r.baseBranch })),
      mcpServerRefPool: run.mcpServerRefPool.map((r) => ({ mcpServerId: r.mcpServerId, envOverrides: { ...r.envOverrides } })),
      workNodeConfigs: run.workNodeConfigs.map((c) => ({
        id: c.id,
        sequence: c.sequence,
        model: c.model,
        taskCount: c.taskConfigs.length,
        pauseAfter: c.pauseAfter,
        gitRefConfigs: c.gitRefConfigs.map((g) => ({ gitId: g.gitId, baseBranch: g.baseBranch })),
        mcpServerRefConfigs: c.mcpServerRefConfigs.map((m) => ({ mcpServerId: m.mcpServerId, envOverrides: { ...m.envOverrides } })),
        taskConfigs: c.taskConfigs.map((tc) => ({ order: tc.order, query: tc.query, hasReportOutline: tc.requiresReport() })),
      })),
    };
  }
}
