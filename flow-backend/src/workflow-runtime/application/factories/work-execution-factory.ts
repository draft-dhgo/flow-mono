import { Injectable } from '@nestjs/common';
import {
  WorkExecution, Report, ReportId,
  WorkNodeConfig, WorkflowRunId,
} from '../../domain/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import type { ReportOutline } from '@common/value-objects/index.js';

export interface WorkExecutionBuildResult {
  readonly workExecution: WorkExecution;
  readonly reports: Report[];
}

@Injectable()
export class WorkExecutionFactory {
  buildFromConfig(
    workflowRunId: WorkflowRunId,
    workflowId: WorkflowId,
    config: WorkNodeConfig,
  ): WorkExecutionBuildResult {
    const outlinesByOrder = new Map<number, { reportId: ReportId; outline: ReportOutline }>();
    for (const tc of config.taskConfigs) {
      if (tc.reportOutline) {
        outlinesByOrder.set(tc.order, { reportId: ReportId.generate(), outline: tc.reportOutline });
      }
    }

    const taskProps = config.taskConfigs.map((tc) => ({
      order: tc.order,
      query: tc.query,
      reportId: outlinesByOrder.get(tc.order)?.reportId ?? null,
    }));

    const workExecution = WorkExecution.create({
      workflowRunId,
      workflowId,
      workNodeConfigId: config.id,
      sequence: config.sequence,
      model: config.model,
      taskProps,
    });

    const reports: Report[] = [];
    for (const task of workExecution.taskExecutions) {
      const entry = outlinesByOrder.get(task.order);
      if (entry) {
        reports.push(Report.createWithId(entry.reportId, {
          taskExecutionId: task.id,
          workExecutionId: workExecution.id,
          workflowRunId,
          outline: entry.outline,
        }));
      }
    }

    return { workExecution, reports };
  }
}
