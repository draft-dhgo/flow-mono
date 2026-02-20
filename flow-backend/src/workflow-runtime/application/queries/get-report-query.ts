import { Injectable, Inject } from '@nestjs/common';
import { ReportRepository } from '../../domain/ports/report-repository.js';
import { FileSystem } from '../../domain/ports/file-system.js';
import { ReportStatus } from '../../domain/value-objects/index.js';
import { ApplicationError } from '@common/errors/index.js';
import type { WorkExecutionId } from '../../domain/value-objects/index.js';

@Injectable()
export class GetReportQuery {
  constructor(
    @Inject(ReportRepository) private readonly reportRepository: ReportRepository,
    private readonly fileSystem: FileSystem,
  ) {}

  async execute(params: { workExecutionId: WorkExecutionId }): Promise<{ content: string }> {
    const reports = await this.reportRepository.findByWorkExecutionId(params.workExecutionId);

    if (reports.length === 0) {
      throw new ApplicationError('REPORT_NOT_FOUND', `No reports found for WorkExecution ${params.workExecutionId}`);
    }

    const completedReports = reports.filter((r) => r.status === ReportStatus.COMPLETED);
    if (completedReports.length === 0) {
      return { content: '' };
    }

    const contents: string[] = [];
    for (const report of completedReports) {
      if (report.content) {
        contents.push(report.content);
      } else if (report.filePath) {
        try {
          const fileContent = await this.fileSystem.readFile(report.filePath);
          contents.push(fileContent);
        } catch {
          contents.push(`(리포트 파일을 읽을 수 없습니다: ${report.filePath})`);
        }
      }
    }

    return { content: contents.join('\n\n---\n\n') };
  }
}
