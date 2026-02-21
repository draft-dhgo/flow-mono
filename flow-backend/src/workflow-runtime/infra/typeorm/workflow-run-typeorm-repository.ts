import type { Repository } from 'typeorm';
import { WorkflowRunRepository } from '../../domain/ports/workflow-run-repository.js';
import { WorkflowRun } from '../../domain/entities/workflow-run.js';
import type { WorkflowRunRow } from './workflow-run.schema.js';
import {
  WorkflowRunId, WorkExecutionId, WorkflowRunStatus, WorkNodeConfigId,
  WorkNodeConfig, TaskNodeConfig, GitRefNodeConfig, McpServerRefNodeConfig,
} from '../../domain/value-objects/index.js';
import { WorkflowId, GitId, McpServerId } from '@common/ids/index.js';
import { ReportOutline, Section } from '@common/value-objects/index.js';
import { OptimisticLockError } from '@common/errors/index.js';

interface SerializedTaskNodeConfig {
  order: number;
  query: string;
  reportOutline: { sections: { title: string; description: string }[] } | null;
}

interface SerializedGitRefNodeConfig {
  gitId: string;
  baseBranch: string;
}

interface SerializedMcpServerRefNodeConfig {
  mcpServerId: string;
  envOverrides: Record<string, string>;
}

interface SerializedWorkNodeConfig {
  id: string;
  sequence: number;
  model: string;
  taskConfigs: SerializedTaskNodeConfig[];
  gitRefConfigs: SerializedGitRefNodeConfig[];
  mcpServerRefConfigs: SerializedMcpServerRefNodeConfig[];
  pauseAfter: boolean;
  reportFileRefs?: number[];
}

export class WorkflowRunTypeormRepository extends WorkflowRunRepository {
  constructor(private readonly repo: Repository<WorkflowRunRow>) {
    super();
  }

  private deserializeGitRefPool(data: unknown): GitRefNodeConfig[] {
    const items = data as SerializedGitRefNodeConfig[];
    return items.map((item) => GitRefNodeConfig.fromProps({
      gitId: GitId.create(item.gitId),
      baseBranch: item.baseBranch,
    }));
  }

  private deserializeMcpServerRefPool(data: unknown): McpServerRefNodeConfig[] {
    const items = data as SerializedMcpServerRefNodeConfig[];
    return items.map((item) => McpServerRefNodeConfig.fromProps({
      mcpServerId: McpServerId.create(item.mcpServerId),
      envOverrides: item.envOverrides,
    }));
  }

  private deserializeWorkNodeConfigs(data: unknown): WorkNodeConfig[] {
    const items = data as SerializedWorkNodeConfig[];
    return items.map((item) => {
      const taskConfigs = item.taskConfigs.map((tc) => {
        let reportOutline: ReportOutline | null = null;
        if (tc.reportOutline) {
          reportOutline = ReportOutline.fromProps(
            tc.reportOutline.sections.map((s) => Section.fromProps(s.title, s.description)),
          );
        }
        return TaskNodeConfig.fromProps({ order: tc.order, query: tc.query, reportOutline });
      });
      return WorkNodeConfig.fromProps({
        id: WorkNodeConfigId.create(item.id),
        sequence: item.sequence,
        model: item.model,
        taskConfigs,
        gitRefConfigs: item.gitRefConfigs.map((gr) =>
          GitRefNodeConfig.fromProps({ gitId: GitId.create(gr.gitId), baseBranch: gr.baseBranch }),
        ),
        mcpServerRefConfigs: item.mcpServerRefConfigs.map((mr) =>
          McpServerRefNodeConfig.fromProps({ mcpServerId: McpServerId.create(mr.mcpServerId), envOverrides: mr.envOverrides }),
        ),
        pauseAfter: item.pauseAfter,
        reportFileRefs: item.reportFileRefs ?? [],
      });
    });
  }

  private serializeGitRefPool(refs: readonly GitRefNodeConfig[]): SerializedGitRefNodeConfig[] {
    return refs.map((r) => ({ gitId: r.gitId as string, baseBranch: r.baseBranch }));
  }

  private serializeMcpServerRefPool(refs: readonly McpServerRefNodeConfig[]): SerializedMcpServerRefNodeConfig[] {
    return refs.map((r) => ({ mcpServerId: r.mcpServerId as string, envOverrides: { ...r.envOverrides } }));
  }

  private serializeWorkNodeConfigs(configs: readonly WorkNodeConfig[]): SerializedWorkNodeConfig[] {
    return configs.map((c) => ({
      id: c.id as string,
      sequence: c.sequence,
      model: c.model,
      taskConfigs: c.taskConfigs.map((tc) => ({
        order: tc.order,
        query: tc.query,
        reportOutline: tc.reportOutline
          ? { sections: tc.reportOutline.sections.map((s) => ({ title: s.title, description: s.description })) }
          : null,
      })),
      gitRefConfigs: c.gitRefConfigs.map((gr) => ({ gitId: gr.gitId as string, baseBranch: gr.baseBranch })),
      mcpServerRefConfigs: c.mcpServerRefConfigs.map((mr) => ({ mcpServerId: mr.mcpServerId as string, envOverrides: { ...mr.envOverrides } })),
      pauseAfter: c.pauseAfter,
      reportFileRefs: [...c.reportFileRefs],
    }));
  }

  private toDomain(row: WorkflowRunRow): WorkflowRun {
    const workExecutionIdsData = row.work_execution_ids as string[];
    return WorkflowRun.fromProps({
      id: WorkflowRunId.create(row.id),
      workflowId: WorkflowId.create(row.workflow_id),
      issueKey: row.issue_key,
      seedValues: (row.seed_values as Record<string, string>) ?? {},
      status: row.status as WorkflowRunStatus,
      currentWorkIndex: row.current_work_index,
      cancelledAtWorkIndex: row.cancelled_at_work_index,
      cancellationReason: row.cancellation_reason,
      workExecutionIds: workExecutionIdsData.map((id) => WorkExecutionId.create(id)),
      gitRefPool: this.deserializeGitRefPool(row.git_ref_pool),
      mcpServerRefPool: this.deserializeMcpServerRefPool(row.mcp_server_ref_pool),
      workNodeConfigs: this.deserializeWorkNodeConfigs(row.work_node_configs),
      restoredToCheckpoint: row.restored_to_checkpoint,
      version: row.version,
    });
  }

  private toRow(entity: WorkflowRun): WorkflowRunRow {
    return {
      id: entity.id as string,
      workflow_id: entity.workflowId as string,
      issue_key: entity.issueKey,
      seed_values: { ...entity.seedValues },
      status: entity.status as string,
      current_work_index: entity.currentWorkIndex,
      cancelled_at_work_index: entity.cancelledAtWorkIndex,
      cancellation_reason: entity.cancellationReason,
      work_execution_ids: entity.workExecutionIds.map((id) => id as string),
      git_ref_pool: this.serializeGitRefPool(entity.gitRefPool),
      mcp_server_ref_pool: this.serializeMcpServerRefPool(entity.mcpServerRefPool),
      work_node_configs: this.serializeWorkNodeConfigs(entity.workNodeConfigs),
      restored_to_checkpoint: entity.restoredToCheckpoint,
      version: entity.version,
    };
  }

  async findById(id: WorkflowRunId): Promise<WorkflowRun | null> {
    const row = await this.repo.findOneBy({ id: id as string });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<WorkflowRun[]> {
    const rows = await this.repo.find();
    return rows.map((row) => this.toDomain(row));
  }

  async findByWorkflowId(workflowId: WorkflowId): Promise<WorkflowRun[]> {
    const rows = await this.repo.findBy({
      workflow_id: workflowId as string,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(workflowRun: WorkflowRun): Promise<void> {
    const row = this.toRow(workflowRun);
    if (workflowRun.version > 1) {
      const result = await this.repo
        .createQueryBuilder()
        .update()
        .set(row as unknown as Record<string, unknown>)
        .where('id = :id AND version = :version', {
          id: row.id,
          version: workflowRun.version - 1,
        })
        .execute();
      if (result.affected === 0) {
        throw new OptimisticLockError('WorkflowRun', row.id);
      }
    } else {
      await this.repo.save(row);
    }
  }

  async delete(id: WorkflowRunId): Promise<void> {
    await this.repo.delete({ id: id as string });
  }

  async exists(id: WorkflowRunId): Promise<boolean> {
    const count = await this.repo.countBy({ id: id as string });
    return count > 0;
  }
}
