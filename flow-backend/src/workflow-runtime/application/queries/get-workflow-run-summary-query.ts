import { Injectable, Inject } from '@nestjs/common';
import { WorkflowRunRepository } from '../../domain/ports/workflow-run-repository.js';

export interface WorkflowRunSummary {
  initialized: number;
  running: number;
  paused: number;
  awaiting: number;
  completed: number;
  cancelled: number;
}

@Injectable()
export class GetWorkflowRunSummaryQuery {
  constructor(
    @Inject(WorkflowRunRepository) private readonly workflowRunRepository: WorkflowRunRepository,
  ) {}

  async execute(): Promise<WorkflowRunSummary> {
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
}
