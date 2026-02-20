import { Injectable } from '@nestjs/common';
import {
  WorkflowRun, WorkNodeConfig, TaskNodeConfig,
  GitRefNodeConfig, McpServerRefNodeConfig,
} from '../../domain/index.js';
import { ReportOutline, Section } from '@common/value-objects/index.js';
import type { WorkflowConfig } from '@common/ports/index.js';

export interface WorkflowRunBuildResult {
  readonly run: WorkflowRun;
}

@Injectable()
export class WorkflowRunFactory {
  build(config: WorkflowConfig, issueKey: string, seedValues: Record<string, string> = {}): WorkflowRunBuildResult {
    const workNodeConfigs = config.workDefinitions.map((wd) => {
      const taskConfigs = wd.taskDefinitions.map((td) => {
        let reportOutline: ReportOutline | null = null;
        if (td.reportOutline) {
          reportOutline = ReportOutline.create(
            td.reportOutline.sections.map((s) => Section.create(s.title, s.description)),
          );
        }
        return TaskNodeConfig.create(td.order, this.resolveQuery(td.query, issueKey, seedValues), reportOutline);
      });

      return WorkNodeConfig.create({
        sequence: wd.order,
        model: wd.model,
        taskConfigs,
        gitRefConfigs: wd.gitRefs.map((gr) =>
          GitRefNodeConfig.create(gr.gitId, gr.baseBranch),
        ),
        mcpServerRefConfigs: wd.mcpServerRefs.map((mr) =>
          McpServerRefNodeConfig.create(mr.mcpServerId, mr.envOverrides),
        ),
        pauseAfter: wd.pauseAfter,
      });
    });

    const gitRefPool = config.gitRefs.map((gr) =>
      GitRefNodeConfig.create(gr.gitId, gr.baseBranch),
    );
    const mcpServerRefPool = config.mcpServerRefs.map((mr) =>
      McpServerRefNodeConfig.create(mr.mcpServerId, mr.envOverrides),
    );

    const run = WorkflowRun.create({
      workflowId: config.id,
      issueKey,
      seedValues,
      gitRefPool,
      mcpServerRefPool,
      workNodeConfigs,
    });

    return { run };
  }

  private resolveQuery(query: string, issueKey: string, seedValues: Record<string, string>): string {
    let resolved = query.replaceAll('{issueKey}', issueKey);
    for (const [key, value] of Object.entries(seedValues)) {
      resolved = resolved.replaceAll(`{seed:${key}}`, value);
    }
    return resolved;
  }
}
