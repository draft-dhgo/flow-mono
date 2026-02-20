import type { WorkExecution } from '../domain/entities/work-execution.js';
import type { WorkExecutionId, WorkflowRunId } from '../domain/value-objects/index.js';
import { WorkExecutionRepository } from '../domain/ports/work-execution-repository.js';

export class InMemoryWorkExecutionRepository extends WorkExecutionRepository {
  private readonly store = new Map<WorkExecutionId, WorkExecution>();

  async findById(id: WorkExecutionId): Promise<WorkExecution | null> {
    return this.store.get(id) ?? null;
  }

  async findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<WorkExecution[]> {
    return [...this.store.values()].filter((we) => we.workflowRunId === workflowRunId);
  }

  async findByWorkflowRunIdOrderedBySequence(workflowRunId: WorkflowRunId): Promise<WorkExecution[]> {
    return (await this.findByWorkflowRunId(workflowRunId))
      .sort((a, b) => a.sequence - b.sequence);
  }

  async save(workExecution: WorkExecution): Promise<void> {
    this.store.set(workExecution.id, workExecution);
  }

  async saveAll(workExecutions: WorkExecution[]): Promise<void> {
    for (const we of workExecutions) {
      this.store.set(we.id, we);
    }
  }

  async delete(id: WorkExecutionId): Promise<void> {
    this.store.delete(id);
  }

  async deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void> {
    for (const [id, we] of this.store) {
      if (we.workflowRunId === workflowRunId) this.store.delete(id);
    }
  }

  async exists(id: WorkExecutionId): Promise<boolean> {
    return this.store.has(id);
  }
}
