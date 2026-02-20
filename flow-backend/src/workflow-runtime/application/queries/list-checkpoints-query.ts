import { Injectable, Inject } from '@nestjs/common';
import { CheckpointRepository } from '../../domain/ports/checkpoint-repository.js';
import type { WorkflowRunId } from '../../domain/value-objects/index.js';

export interface CheckpointReadModel {
  id: string;
  workflowRunId: string;
  workflowId: string;
  workExecutionId: string;
  workSequence: number;
  createdAt: string;
}

@Injectable()
export class ListCheckpointsQuery {
  constructor(
    @Inject(CheckpointRepository) private readonly checkpointRepository: CheckpointRepository,
  ) {}

  async execute(params: { workflowRunId: WorkflowRunId }): Promise<CheckpointReadModel[]> {
    const checkpoints = await this.checkpointRepository.findByWorkflowRunId(params.workflowRunId);
    return checkpoints.map((cp) => ({
      id: cp.id,
      workflowRunId: cp.workflowRunId,
      workflowId: cp.workflowId,
      workExecutionId: cp.workExecutionId,
      workSequence: cp.workSequence,
      createdAt: cp.createdAt.toISOString(),
    }));
  }
}
