import type { Repository } from 'typeorm';
import { WorkTreeRepository } from '../../domain/ports/work-tree-repository.js';
import { WorkTree } from '../../domain/entities/work-tree.js';
import type { WorkTreeRow } from './work-tree.schema.js';
import { WorkTreeId, WorkflowRunId } from '../../domain/value-objects/index.js';
import { GitId } from '@common/ids/index.js';

export class WorkTreeTypeormRepository extends WorkTreeRepository {
  constructor(private readonly repo: Repository<WorkTreeRow>) {
    super();
  }

  private toDomain(row: WorkTreeRow): WorkTree {
    return WorkTree.fromProps({
      id: WorkTreeId.create(row.id),
      gitId: GitId.create(row.git_id),
      workflowRunId: WorkflowRunId.create(row.workflow_run_id),
      path: row.path,
      branch: row.branch,
      version: row.version,
    });
  }

  private toRow(entity: WorkTree): WorkTreeRow {
    return {
      id: entity.id as string,
      git_id: entity.gitId as string,
      workflow_run_id: entity.workflowRunId as string,
      path: entity.path,
      branch: entity.branch,
      version: entity.version,
    };
  }

  async findById(id: WorkTreeId): Promise<WorkTree | null> {
    const row = await this.repo.findOneBy({ id: id as string });
    return row ? this.toDomain(row) : null;
  }

  async findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<WorkTree[]> {
    const rows = await this.repo.findBy({
      workflow_run_id: workflowRunId as string,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(workTree: WorkTree): Promise<void> {
    const row = this.toRow(workTree);
    await this.repo.save(row);
  }

  async delete(id: WorkTreeId): Promise<void> {
    await this.repo.delete({ id: id as string });
  }

  async deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void> {
    await this.repo.delete({ workflow_run_id: workflowRunId as string });
  }

  async exists(id: WorkTreeId): Promise<boolean> {
    const count = await this.repo.countBy({ id: id as string });
    return count > 0;
  }
}
