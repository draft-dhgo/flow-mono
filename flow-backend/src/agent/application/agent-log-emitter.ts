import { Injectable, Logger } from '@nestjs/common';
import { Subject, type Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import type { AgentLogEntry, AgentLogEntryType, AgentLogEntryContent } from './agent-log-entry.js';
import { createAgentLogEntry } from './agent-log-entry.js';
import { AgentLogRepository } from './ports/agent-log-repository.js';

@Injectable()
export class AgentLogEmitter {
  private readonly logger = new Logger(AgentLogEmitter.name);
  private readonly buffers = new Map<string, AgentLogEntry[]>();
  private readonly subject = new Subject<AgentLogEntry>();

  constructor(private readonly repo: AgentLogRepository) {}

  bufferEntry(sessionId: string, entryType: AgentLogEntryType, content: AgentLogEntryContent): void {
    const entry = createAgentLogEntry(entryType, content);
    const buf = this.buffers.get(sessionId) ?? [];
    buf.push(entry);
    this.buffers.set(sessionId, buf);
  }

  async tagAndFlush(sessionId: string, workExecutionId: string): Promise<void> {
    const buf = this.buffers.get(sessionId) ?? [];
    this.logger.log(`tagAndFlush: sessionId=${sessionId}, weId=${workExecutionId}, bufferSize=${buf.length}`);
    this.buffers.delete(sessionId);

    const tagged = buf.map((e) => ({ ...e, workExecutionId }));

    if (tagged.length > 0) {
      await this.repo.saveAll(tagged);
      this.logger.log(`Flushed ${tagged.length} entries for weId=${workExecutionId}`);
      for (const entry of tagged) {
        this.subject.next(entry);
      }
    }
  }

  transferBuffer(fromKey: string, toKey: string): void {
    const fromBuf = this.buffers.get(fromKey);
    if (!fromBuf || fromBuf.length === 0) return;
    this.buffers.delete(fromKey);
    const toBuf = this.buffers.get(toKey) ?? [];
    this.buffers.set(toKey, [...fromBuf, ...toBuf]);
  }

  emitDirect(workExecutionId: string, entryType: AgentLogEntryType, content: AgentLogEntryContent): void {
    const entry = createAgentLogEntry(entryType, content, workExecutionId);
    void this.repo.save(entry).catch((err: unknown) => {
      this.logger.error('Failed to save log entry:', err);
    });
    this.subject.next(entry);
  }

  stream(workExecutionId: string): Observable<AgentLogEntry> {
    return this.subject.asObservable().pipe(
      filter((entry) => entry.workExecutionId === workExecutionId),
    );
  }
}
