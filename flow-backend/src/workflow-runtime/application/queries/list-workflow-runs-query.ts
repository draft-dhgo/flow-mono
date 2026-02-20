import { Injectable, Inject } from '@nestjs/common';
import { WorkflowRunRepository } from '../../domain/ports/workflow-run-repository.js';
import { WorkflowConfigReader } from '@common/ports/index.js';
import type { WorkflowRun } from '../../domain/entities/workflow-run.js';

@Injectable()
export class ListWorkflowRunsQuery {
  constructor(
    @Inject(WorkflowRunRepository) private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workflowConfigReader: WorkflowConfigReader,
  ) {}

  async execute() {
    const runs = await this.workflowRunRepository.findAll();
    const serialized = await Promise.all(
      runs.map(async (run) => {
        const workflow = await this.workflowConfigReader.findById(run.workflowId);
        return { ...serializeRun(run), workflowName: workflow?.name ?? '' };
      }),
    );
    return serialized;
  }
}

function serializeRun(run: WorkflowRun) {
  return {
    id: run.id,
    workflowId: run.workflowId,
    issueKey: run.issueKey,
    status: run.status,
    currentWorkIndex: run.currentWorkIndex,
    totalWorkCount: run.totalWorkCount,
    cancelledAtWorkIndex: run.cancelledAtWorkIndex,
    cancellationReason: run.cancellationReason,
    seedValues: { ...run.seedValues },
    restoredToCheckpoint: run.restoredToCheckpoint,
    workExecutionIds: run.workExecutionIds.map((id) => id as string),
    gitRefPool: run.gitRefPool.map((r) => ({
      gitId: r.gitId,
      baseBranch: r.baseBranch,
    })),
    mcpServerRefPool: run.mcpServerRefPool.map((r) => ({
      mcpServerId: r.mcpServerId,
      envOverrides: { ...r.envOverrides },
    })),
    workNodeConfigs: run.workNodeConfigs.map((c) => ({
      id: c.id,
      sequence: c.sequence,
      model: c.model,
      taskCount: c.taskConfigs.length,
      pauseAfter: c.pauseAfter,
      gitRefConfigs: c.gitRefConfigs.map((g) => ({
        gitId: g.gitId,
        baseBranch: g.baseBranch,
      })),
      mcpServerRefConfigs: c.mcpServerRefConfigs.map((m) => ({
        mcpServerId: m.mcpServerId,
        envOverrides: { ...m.envOverrides },
      })),
      taskConfigs: c.taskConfigs.map((tc) => ({
        order: tc.order,
        query: tc.query,
        hasReportOutline: tc.requiresReport(),
      })),
    })),
  };
}
