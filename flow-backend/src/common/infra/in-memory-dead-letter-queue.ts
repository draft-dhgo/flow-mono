import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface DeadLetterEntry {
  id: string;
  outboxMessageId: string;
  eventType: string;
  payload: unknown;
  aggregateId: string | null;
  correlationId: string | null;
  handlerName: string;
  errorMessage: string | null;
  errorStack: string | null;
  retryCount: number;
  maxRetries: number;
  firstFailedAt: Date;
  lastFailedAt: Date;
  resolved: boolean;
  resolvedAt: Date | null;
}

@Injectable()
export class InMemoryDeadLetterQueue {
  private readonly entries: DeadLetterEntry[] = [];

  add(entry: Omit<DeadLetterEntry, 'id' | 'retryCount' | 'maxRetries' | 'firstFailedAt' | 'lastFailedAt' | 'resolved' | 'resolvedAt'>): void {
    const now = new Date();
    this.entries.push({
      ...entry,
      id: uuidv4(),
      retryCount: 0,
      maxRetries: 5,
      firstFailedAt: now,
      lastFailedAt: now,
      resolved: false,
      resolvedAt: null,
    });
  }

  findUnresolved(): DeadLetterEntry[] {
    return this.entries
      .filter((e) => !e.resolved)
      .sort((a, b) => a.lastFailedAt.getTime() - b.lastFailedAt.getTime());
  }

  markResolved(id: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (entry) {
      entry.resolved = true;
      entry.resolvedAt = new Date();
    }
  }

  incrementRetry(id: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (entry) {
      entry.retryCount++;
      entry.lastFailedAt = new Date();
    }
  }

  clear(): void {
    this.entries.length = 0;
  }
}
