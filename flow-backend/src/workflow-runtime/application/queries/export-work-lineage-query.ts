import { Injectable } from '@nestjs/common';
import { GetWorkLineageQuery } from './get-work-lineage-query.js';

@Injectable()
export class ExportWorkLineageQuery {
  constructor(private readonly getWorkLineageQuery: GetWorkLineageQuery) {}

  async execute(): Promise<string> {
    const entries = await this.getWorkLineageQuery.execute();

    if (entries.length === 0) {
      return '리니지 데이터가 없습니다.';
    }

    const lines: string[] = [];
    lines.push('# 작업 리니지');
    lines.push('');

    for (const entry of entries) {
      lines.push('## ' + entry.issueKey);
      lines.push('');
      lines.push('| 워크플로우 | 상태 | 프로젝트 | 브랜치 | 커밋 해시 | 커밋 수 |');
      lines.push('|---|---|---|---|---|---|');

      for (const runInfo of entry.runs) {
        if (runInfo.repos.length === 0) {
          lines.push(
            '| ' + runInfo.workflowName + ' | ' + runInfo.runStatus + ' | - | - | - | 0 |',
          );
        } else {
          for (const [idx, repo] of runInfo.repos.entries()) {
            const wfName = idx === 0 ? runInfo.workflowName : '';
            const status = idx === 0 ? runInfo.runStatus : '';
            const projectName =
              repo.gitUrl.split('/').pop()?.replace('.git', '') ?? repo.gitId;
            const shortHash =
              repo.commitHash === 'N/A' ? 'N/A' : repo.commitHash.substring(0, 7);
            lines.push(
              '| ' +
                wfName +
                ' | ' +
                status +
                ' | ' +
                projectName +
                ' | ' +
                repo.branch +
                ' | ' +
                shortHash +
                ' | ' +
                String(repo.commitCount) +
                ' |',
            );
          }
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}
