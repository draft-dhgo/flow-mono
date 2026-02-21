import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { DomainEvent } from '../events/domain-event.js';

export interface OutboxMessage {
  id: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  aggregateId: string | null;
  correlationId: string | null;
  occurredAt: Date;
  createdAt: Date;
  published: boolean;
  publishedAt: Date | null;
  retryCount: number;
}

function extractAggregateId(event: DomainEvent): string | null {
  const payload = 'payload' in event ? (event as { payload: Record<string, unknown> }).payload : null;
  if (!payload || typeof payload !== 'object') return null;

  for (const key of ['workflowRunId', 'workflowId', 'workExecutionId']) {
    if (key in payload && typeof payload[key] === 'string') {
      return payload[key] as string;
    }
  }
  return null;
}

@Injectable()
export class InMemoryOutbox {
  private readonly messages: OutboxMessage[] = [];

  add(event: DomainEvent): void {
    const payload = 'payload' in event ? (event as { payload: unknown }).payload : {};
    this.messages.push({
      id: uuidv4(),
      eventId: event.eventId,
      eventType: event.eventType,
      payload,
      aggregateId: extractAggregateId(event),
      correlationId: event.correlationId ?? null,
      occurredAt: event.occurredAt,
      createdAt: new Date(),
      published: false,
      publishedAt: null,
      retryCount: 0,
    });
  }

  findUnpublished(): OutboxMessage[] {
    return this.messages
      .filter((m) => !m.published)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  markPublished(id: string): void {
    const msg = this.messages.find((m) => m.id === id);
    if (msg) {
      msg.published = true;
      msg.publishedAt = new Date();
    }
  }

  incrementRetry(id: string): void {
    const msg = this.messages.find((m) => m.id === id);
    if (msg) {
      msg.retryCount++;
    }
  }

  clear(): void {
    this.messages.length = 0;
  }
}
