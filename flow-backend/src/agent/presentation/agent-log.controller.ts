import { Controller, Get, Param, Sse, type MessageEvent } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ListAgentLogsQuery } from '../application/queries/list-agent-logs-query.js';
import { AgentLogEmitter } from '../application/agent-log-emitter.js';
import type { AgentLogEntry } from '../application/agent-log-entry.js';

function serializeEntry(entry: AgentLogEntry) {
  return {
    id: entry.id,
    workExecutionId: entry.workExecutionId,
    entryType: entry.entryType,
    content: entry.content,
    createdAt: entry.createdAt.toISOString(),
  };
}

@Controller('workflow-runs/:runId/work-executions/:weId/agent-logs')
export class AgentLogController {
  constructor(
    private readonly listAgentLogsQuery: ListAgentLogsQuery,
    private readonly emitter: AgentLogEmitter,
  ) {}

  @Get()
  async getAll(@Param('weId') weId: string) {
    return this.listAgentLogsQuery.execute({ workExecutionId: weId });
  }

  @Sse('stream')
  stream(@Param('weId') weId: string): Observable<MessageEvent> {
    return this.emitter.stream(weId).pipe(
      map((entry) => ({
        data: serializeEntry(entry),
      })),
    );
  }
}
