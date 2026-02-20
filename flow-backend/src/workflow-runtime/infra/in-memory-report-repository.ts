import type { Report } from '../domain/entities/report.js';
import type { ReportId, WorkExecutionId, WorkflowRunId } from '../domain/value-objects/index.js';
import { ReportRepository } from '../domain/ports/report-repository.js';

export class InMemoryReportRepository extends ReportRepository {
  private readonly store = new Map<ReportId, Report>();

  async findById(id: ReportId): Promise<Report | null> {
    return this.store.get(id) ?? null;
  }

  async findByWorkExecutionId(workExecutionId: WorkExecutionId): Promise<Report[]> {
    return [...this.store.values()].filter((r) => r.workExecutionId === workExecutionId);
  }

  async findByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<Report[]> {
    return [...this.store.values()].filter((r) => r.workflowRunId === workflowRunId);
  }

  async save(report: Report): Promise<void> {
    this.store.set(report.id, report);
  }

  async delete(id: ReportId): Promise<void> {
    this.store.delete(id);
  }

  async deleteByWorkflowRunId(workflowRunId: WorkflowRunId): Promise<void> {
    for (const [id, r] of this.store) {
      if (r.workflowRunId === workflowRunId) this.store.delete(id);
    }
  }

  async exists(id: ReportId): Promise<boolean> {
    return this.store.has(id);
  }
}
