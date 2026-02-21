import type { Repository } from 'typeorm';
import { WorkflowRepository } from '../../domain/ports/workflow-repository.js';
import { Workflow } from '../../domain/entities/workflow.js';
import type { WorkflowRow } from './workflow.schema.js';
import { WorkflowId, WorkflowStatus } from '../../domain/value-objects/index.js';
import { BranchStrategy } from '../../domain/value-objects/index.js';
import { BranchName } from '../../domain/value-objects/index.js';
import { GitRef } from '../../domain/value-objects/index.js';
import { McpServerRef } from '../../domain/value-objects/index.js';
import { WorkDefinition, TaskDefinition } from '../../domain/value-objects/index.js';
import type { AgentModel } from '../../domain/value-objects/index.js';
import { GitId, McpServerId } from '@common/ids/index.js';
import { ReportOutline } from '@common/value-objects/index.js';
import { Section } from '@common/value-objects/index.js';

interface GitRefJson {
  gitId: string;
  baseBranch: string;
  valid?: boolean;
}

interface McpServerRefJson {
  mcpServerId: string;
  envOverrides: Record<string, string>;
  valid?: boolean;
}

interface SectionJson {
  title: string;
  description: string;
}

interface TaskDefinitionJson {
  order: number;
  query: string;
  reportOutline: SectionJson[] | null;
}

interface WorkDefinitionJson {
  order: number;
  model: string;
  gitRefs: GitRefJson[];
  mcpServerRefs: McpServerRefJson[];
  taskDefinitions: TaskDefinitionJson[];
  pauseAfter: boolean;
  reportFileRefs?: number[];
}

interface BranchStrategyJson {
  workBranch: string;
}

export class WorkflowTypeormRepository extends WorkflowRepository {
  constructor(private readonly repo: Repository<WorkflowRow>) {
    super();
  }

  private toDomain(row: WorkflowRow): Workflow {
    const branchStrategyData = row.branch_strategy as BranchStrategyJson;
    const gitRefsData = row.git_refs as GitRefJson[];
    const mcpServerRefsData = row.mcp_server_refs as McpServerRefJson[];
    const workDefsData = row.work_definitions as WorkDefinitionJson[];

    return Workflow.fromProps({
      id: WorkflowId.create(row.id),
      name: row.name,
      description: row.description,
      branchStrategy: BranchStrategy.fromProps(
        BranchName.create(branchStrategyData.workBranch),
      ),
      gitRefs: gitRefsData.map((ref) =>
        GitRef.fromProps(GitId.create(ref.gitId), BranchName.create(ref.baseBranch), ref.valid ?? true),
      ),
      mcpServerRefs: mcpServerRefsData.map((ref) =>
        McpServerRef.fromProps(McpServerId.create(ref.mcpServerId), ref.envOverrides, ref.valid ?? true),
      ),
      seedKeys: (row.seed_keys as string[]) ?? [],
      workDefinitions: workDefsData.map((wd) =>
        WorkDefinition.fromProps(
          wd.order,
          wd.model as AgentModel,
          wd.taskDefinitions.map((td) =>
            TaskDefinition.fromProps(
              td.order,
              td.query,
              td.reportOutline
                ? ReportOutline.fromProps(
                    td.reportOutline.map((s) => Section.fromProps(s.title, s.description)),
                  )
                : null,
            ),
          ),
          wd.gitRefs.map((ref) =>
            GitRef.fromProps(GitId.create(ref.gitId), BranchName.create(ref.baseBranch), ref.valid ?? true),
          ),
          wd.mcpServerRefs.map((ref) =>
            McpServerRef.fromProps(McpServerId.create(ref.mcpServerId), ref.envOverrides, ref.valid ?? true),
          ),
          wd.pauseAfter,
          wd.reportFileRefs ?? [],
        ),
      ),
      status: row.status as WorkflowStatus,
      version: row.version,
    });
  }

  private toRow(entity: Workflow): WorkflowRow {
    return {
      id: entity.id as string,
      name: entity.name,
      description: entity.description,
      branch_strategy: {
        workBranch: entity.branchStrategy.workBranch as string,
      },
      git_refs: entity.gitRefs.map((ref) => ({
        gitId: ref.gitId as string,
        baseBranch: ref.baseBranch as string,
        valid: ref.valid,
      })),
      mcp_server_refs: entity.mcpServerRefs.map((ref) => ({
        mcpServerId: ref.mcpServerId as string,
        envOverrides: { ...ref.envOverrides },
        valid: ref.valid,
      })),
      seed_keys: [...entity.seedKeys],
      work_definitions: entity.workDefinitions.map((wd) => ({
        order: wd.order,
        model: wd.model as string,
        gitRefs: wd.gitRefs.map((ref) => ({
          gitId: ref.gitId as string,
          baseBranch: ref.baseBranch as string,
          valid: ref.valid,
        })),
        mcpServerRefs: wd.mcpServerRefs.map((ref) => ({
          mcpServerId: ref.mcpServerId as string,
          envOverrides: { ...ref.envOverrides },
          valid: ref.valid,
        })),
        taskDefinitions: wd.taskDefinitions.map((td) => ({
          order: td.order,
          query: td.query,
          reportOutline: td.reportOutline
            ? td.reportOutline.sections.map((s) => ({
                title: s.title,
                description: s.description,
              }))
            : null,
        })),
        pauseAfter: wd.pauseAfter,
        reportFileRefs: [...wd.reportFileRefs],
      })),
      status: entity.status as string,
      version: entity.version,
    };
  }

  async findById(id: WorkflowId): Promise<Workflow | null> {
    const row = await this.repo.findOneBy({ id: id as string });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Workflow[]> {
    const rows = await this.repo.find();
    return rows.map((row) => this.toDomain(row));
  }

  async findByGitId(gitId: GitId): Promise<Workflow[]> {
    const rows = await this.repo
      .createQueryBuilder('w')
      .where(`w.git_refs @> :gitRef::jsonb`, {
        gitRef: JSON.stringify([{ gitId: gitId as string }]),
      })
      .getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async findByMcpServerId(mcpServerId: McpServerId): Promise<Workflow[]> {
    const rows = await this.repo
      .createQueryBuilder('w')
      .where(`w.mcp_server_refs @> :mcpRef::jsonb`, {
        mcpRef: JSON.stringify([{ mcpServerId: mcpServerId as string }]),
      })
      .getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async save(workflow: Workflow): Promise<void> {
    const row = this.toRow(workflow);
    await this.repo.save(row);
  }

  async delete(id: WorkflowId): Promise<void> {
    await this.repo.delete({ id: id as string });
  }

  async exists(id: WorkflowId): Promise<boolean> {
    const count = await this.repo.countBy({ id: id as string });
    return count > 0;
  }
}
