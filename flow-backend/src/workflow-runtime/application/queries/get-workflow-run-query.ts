import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { WorkflowRunRepository } from '../../domain/ports/workflow-run-repository.js';
import { WorkflowConfigReader } from '@common/ports/index.js';
import type { WorkflowRun } from '../../domain/entities/workflow-run.js';
import type { WorkflowRunId } from '../../domain/value-objects/index.js';

@Injectable()
export class GetWorkflowRunQuery {
  constructor(
    @Inject(WorkflowRunRepository) private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workflowConfigReader: WorkflowConfigReader,
  ) {}

  async execute(params: { workflowRunId: WorkflowRunId }) {
    const run = await this.workflowRunRepository.findById(params.workflowRunId);
    if (!run) {
      throw new NotFoundException(`WorkflowRun not found: ${params.workflowRunId}`);
    }
    const workflow = await this.workflowConfigReader.findById(run.workflowId);
    return {
      ...serializeRun(run),
      seedKeys: workflow ? [...workflow.seedKeys] : [],
    };
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
