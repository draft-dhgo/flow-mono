import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { DomainEvent } from '../events/domain-event.js';
import type { EventHandler } from '../ports/event-publisher.js';
import { EventPublisher } from '../ports/event-publisher.js';
import { InMemoryEventPublisher } from './in-memory-event-publisher.js';
import type { InMemoryOutbox } from './in-memory-outbox.js';
import type { OutboxMessageRow } from './typeorm/outbox-message.schema.js';

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

export class TransactionalEventPublisher extends EventPublisher {
  private readonly logger = new Logger(TransactionalEventPublisher.name);
  private readonly inner: InMemoryEventPublisher;

  constructor(
    private readonly outboxRepo: Repository<OutboxMessageRow> | null,
    private readonly inMemoryOutbox: InMemoryOutbox,
    inner?: InMemoryEventPublisher,
  ) {
    super();
    this.inner = inner ?? new InMemoryEventPublisher();
  }

  async publish(event: DomainEvent): Promise<void> {
    const payload = 'payload' in event ? (event as { payload: unknown }).payload : {};

    if (this.outboxRepo) {
      try {
        await this.outboxRepo.save({
          event_id: event.eventId,
          event_type: event.eventType,
          payload,
          aggregate_id: extractAggregateId(event),
          correlation_id: event.correlationId ?? null,
          occurred_at: event.occurredAt,
          published: false,
          retry_count: 0,
        } as OutboxMessageRow);
      } catch (err: unknown) {
        this.logger.error('Failed to persist outbox message:', (err as Error).message);
      }
    } else {
      this.inMemoryOutbox.add(event);
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
