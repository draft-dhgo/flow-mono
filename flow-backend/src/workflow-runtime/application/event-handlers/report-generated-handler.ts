import { Injectable, Logger } from '@nestjs/common';
import { ReportRepository } from '../../domain/index.js';
import type { ReportId } from '../../domain/index.js';
import type { ReportCompleted } from '@common/events/index.js';

@Injectable()
export class ReportGeneratedHandler {
  private readonly logger = new Logger(ReportGeneratedHandler.name);

  constructor(
    private readonly reportRepository: ReportRepository,
  ) {}

  async handle(event: ReportCompleted): Promise<void> {
    const { reportId, taskExecutionId, workExecutionId, workflowRunId, filePath } = event.payload;
    this.logger.log(
      `ReportCompleted: reportId=${reportId}, taskId=${taskExecutionId}, weId=${workExecutionId}, runId=${workflowRunId}`,
    );

    const report = await this.reportRepository.findById(reportId as ReportId);
    if (!report) {
      this.logger.warn('Report not found for ReportCompleted: reportId=' + reportId);
      return;
    }

    this.logger.log(`Report generated at: ${filePath}`);

    // Handler enables cross-cutting concerns like metrics tracking and SSE notifications
    // for report completion events. The report entity state is managed by SendQueryUseCase.
  }
}
