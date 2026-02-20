import { WorkflowRunActiveChecker } from '@common/ports/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import type { WorkflowRunRepository } from '../domain/ports/workflow-run-repository.js';

export class WorkflowRunActiveCheckerImpl extends WorkflowRunActiveChecker {
  constructor(private readonly workflowRunRepository: WorkflowRunRepository) {
    super();
  }

  async hasActiveRuns(workflowId: WorkflowId): Promise<boolean> {
    const runs = await this.workflowRunRepository.findByWorkflowId(workflowId);
    return runs.some(run => !run.isTerminal());
  }
}
