import type { Repository } from 'typeorm';
import { CheckpointRepository } from '../../domain/ports/checkpoint-repository.js';
import { Checkpoint } from '../../domain/entities/checkpoint.js';
import type { CheckpointRow } from './checkpoint.schema.js';
import { CheckpointId, WorkflowRunId, WorkExecutionId } from '../../domain/value-objects/index.js';
import { CommitHash } from '../../domain/value-objects/index.js';
import { WorkflowId, GitId } from '@common/ids/index.js';
import { OptimisticLockError } from '@common/errors/index.js';

export class CheckpointTypeormRepository extends CheckpointRepository {
  constructor(private readonly repo: Repository<CheckpointRow>) {
    super();
  }

  private toDomain(row: CheckpointRow): Checkpoint {
    const commitHashesData = row.commit_hashes as Record<string, string>;
    const commitHashes = new Map<GitId, CommitHash>();
    for (const [gitIdStr, hashStr] of Object.entries(commitHashesData)) {
      commitHashes.set(GitId.create(gitIdStr), CommitHash.create(hashStr));
    }

    return Checkpoint.fromProps({
      id: CheckpointId.create(row.id),
      workflowRunId: WorkflowRunId.create(row.workflow_run_id),
      workflowId: WorkflowId.create(row.workflow_id),
      workExecutionId: WorkExecutionId.create(row.work_execution_id),
      workSequence: row.work_sequence,
      commitHashes,
      createdAt: new Date(row.created_at),
      version: row.version,
    });
  }

  private toRow(entity: Checkpoint): CheckpointRow {
    const commitHashesObj: Record<string, string> = {};
    for (const [gitId, hash] of entity.commitHashes) {
      commitHashesObj[gitId as string] = hash as string;
    }

    return {
      id: entity.id as string,
      workflow_run_id: entity.workflowRunId as string,
      workflow_id: entity.workflowId as string,
      work_execution_id: entity.workExecutionId as string,
      work_sequence: entity.workSequence,
      commit_hashes: commitHashesObj,
      created_at: entity.createdAt,
      version: entity.version,
    };
  }

  async findById(id: CheckpointId): Promise<Checkpoint | null> {
    const row = await this.repo.findOneBy({ id: id as string });
    return row ? this.toDomain(row) : null;
  }

  async findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<Checkpoint[]> {
    const rows = await this.repo.findBy({
      workflow_run_id: workflowRunId as string,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    const row = this.toRow(checkpoint);
    if (checkpoint.version > 1) {
      const result = await this.repo
        .createQueryBuilder()
        .update()
        .set(row as unknown as Record<string, unknown>)
        .where('id = :id AND version = :version', {
          id: row.id,
          version: checkpoint.version - 1,
        })
        .execute();
      if (result.affected === 0) {
        throw new OptimisticLockError('Checkpoint', row.id);
      }
    } else {
      await this.repo.save(row);
    }
  }

  async delete(id: CheckpointId): Promise<void> {
    await this.repo.delete({ id: id as string });
  }

  async deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void> {
    await this.repo.delete({ workflow_run_id: workflowRunId as string });
  }

  async exists(id: CheckpointId): Promise<boolean> {
    const count = await this.repo.countBy({ id: id as string });
    return count > 0;
  }
}
