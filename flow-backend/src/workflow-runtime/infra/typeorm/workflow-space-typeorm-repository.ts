import type { Repository } from 'typeorm';
import { WorkflowSpaceRepository } from '../../domain/ports/workflow-space-repository.js';
import { WorkflowSpace } from '../../domain/entities/workflow-space.js';
import { WorkSpace } from '../../domain/entities/work-space.js';
import type { WorkflowSpaceRow } from './workflow-space.schema.js';
import { WorkflowSpaceId, WorkflowRunId, WorkSpaceId, WorkExecutionId } from '../../domain/value-objects/index.js';
import { SymLink, LinkType } from '../../domain/value-objects/index.js';
import { OptimisticLockError } from '@common/errors/index.js';

interface SymLinkJson {
  type: string;
  targetId: string;
  targetPath: string;
  linkPath: string;
}

interface WorkSpaceJson {
  id: string;
  workExecutionId: string;
  path: string;
  links: SymLinkJson[];
}

export class WorkflowSpaceTypeormRepository extends WorkflowSpaceRepository {
  constructor(private readonly repo: Repository<WorkflowSpaceRow>) {
    super();
  }

  private toDomain(row: WorkflowSpaceRow): WorkflowSpace {
    const workSpacesData = row.work_spaces as WorkSpaceJson[];
    return WorkflowSpace.fromProps({
      id: WorkflowSpaceId.create(row.id),
      workflowRunId: WorkflowRunId.create(row.workflow_run_id),
      path: row.path,
      workSpaces: workSpacesData.map((ws) =>
        WorkSpace.fromProps({
          id: WorkSpaceId.create(ws.id),
          workExecutionId: WorkExecutionId.create(ws.workExecutionId),
          path: ws.path,
          links: ws.links.map((l) =>
            SymLink.fromProps(l.type as LinkType, l.targetId, l.targetPath, l.linkPath),
          ),
        }),
      ),
      version: row.version,
    });
  }

  private toRow(entity: WorkflowSpace): WorkflowSpaceRow {
    return {
      id: entity.id as string,
      workflow_run_id: entity.workflowRunId as string,
      path: entity.path,
      work_spaces: entity.workSpaces.map((ws) => ({
        id: ws.id as string,
        workExecutionId: ws.workExecutionId as string,
        path: ws.path,
        links: ws.links.map((l) => ({
          type: l.type as string,
          targetId: l.targetId,
          targetPath: l.targetPath,
          linkPath: l.linkPath,
        })),
      })),
      version: entity.version,
    };
  }

  async findById(id: WorkflowSpaceId): Promise<WorkflowSpace | null> {
    const row = await this.repo.findOneBy({ id: id as string });
    return row ? this.toDomain(row) : null;
  }

  async findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<WorkflowSpace | null> {
    const row = await this.repo.findOneBy({
      workflow_run_id: workflowRunId as string,
    });
    return row ? this.toDomain(row) : null;
  }

  async save(workflowSpace: WorkflowSpace): Promise<void> {
    const row = this.toRow(workflowSpace);
    if (workflowSpace.version > 1) {
      const result = await this.repo
        .createQueryBuilder()
        .update()
        .set(row as unknown as Record<string, unknown>)
        .where('id = :id AND version = :version', {
          id: row.id,
          version: workflowSpace.version - 1,
        })
        .execute();
      if (result.affected === 0) {
        throw new OptimisticLockError('WorkflowSpace', row.id);
      }
    } else {
      await this.repo.save(row);
    }
  }

  async delete(id: WorkflowSpaceId): Promise<void> {
    await this.repo.delete({ id: id as string });
  }

  async deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void> {
    await this.repo.delete({ workflow_run_id: workflowRunId as string });
  }

  async exists(id: WorkflowSpaceId): Promise<boolean> {
    const count = await this.repo.countBy({ id: id as string });
    return count > 0;
  }
}
