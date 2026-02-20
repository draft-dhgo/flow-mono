import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { DomainEvent } from '../events/domain-event.js';
import type { EventHandler } from '../ports/event-publisher.js';
import { EventPublisher } from '../ports/event-publisher.js';
import { InMemoryEventPublisher } from './in-memory-event-publisher.js';
import type { DomainEventRow } from './typeorm/domain-event.schema.js';

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

function toRow(event: DomainEvent): Partial<DomainEventRow> {
  const payload = 'payload' in event ? (event as { payload: unknown }).payload : {};
  return {
    event_id: event.eventId,
    event_type: event.eventType,
    payload: payload as unknown,
    aggregate_id: extractAggregateId(event),
    correlation_id: event.correlationId ?? null,
    occurred_at: event.occurredAt,
  };
}

export class PersistentEventPublisher extends EventPublisher {
  private readonly logger = new Logger(PersistentEventPublisher.name);
  private readonly inner = new InMemoryEventPublisher();

  constructor(private readonly repo: Repository<DomainEventRow> | null) {
    super();
  }

  async publish(event: DomainEvent): Promise<void> {
    if (this.repo) {
      try {
        await this.repo.save(toRow(event) as DomainEventRow);
      } catch (err: unknown) {
        this.logger.error('Failed to persist event:', (err as Error).message);
      }
    }
    await this.inner.publish(event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    this.inner.subscribe(eventType, handler);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    this.inner.unsubscribe(eventType, handler);
  }

  getPublishedEvents(): ReadonlyArray<DomainEvent> {
    return this.inner.getPublishedEvents();
  }

  clear(): void {
    this.inner.clear();
  }
}
