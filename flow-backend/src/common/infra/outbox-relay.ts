import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { DomainEvent } from '../events/domain-event.js';
import { InMemoryEventPublisher } from './in-memory-event-publisher.js';
import type { InMemoryOutbox, OutboxMessage } from './in-memory-outbox.js';
import type { InMemoryDeadLetterQueue } from './in-memory-dead-letter-queue.js';
import type { OutboxMessageRow } from './typeorm/outbox-message.schema.js';
import type { DeadLetterMessageRow } from './typeorm/dead-letter-message.schema.js';

const MAX_RETRIES = 5;
const POLL_INTERVAL_MS = 5000;
const BATCH_SIZE = 100;

@Injectable()
export class OutboxRelay implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelay.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly outboxRepo: Repository<OutboxMessageRow> | null,
    private readonly inMemoryOutbox: InMemoryOutbox,
    private readonly eventPublisher: InMemoryEventPublisher,
    private readonly dlqRepo: Repository<DeadLetterMessageRow> | null,
    private readonly inMemoryDlq: InMemoryDeadLetterQueue,
  ) {}

  onModuleInit(): void {
    this.intervalId = setInterval(() => {
      void this.processOutbox();
    }, POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async processOutbox(): Promise<void> {
    try {
      if (this.outboxRepo) {
        await this.processDbOutbox();
      } else {
        await this.processInMemoryOutbox();
      }
    } catch (err: unknown) {
      this.logger.error(`Outbox relay error: ${(err as Error).message}`);
    }
  }

  private async processDbOutbox(): Promise<void> {
    if (!this.outboxRepo) return;

    const messages = await this.outboxRepo
      .createQueryBuilder('m')
      .where('m.published = :published', { published: false })
      .orderBy('m.created_at', 'ASC')
      .limit(BATCH_SIZE)
      .getMany();

    for (const msg of messages) {
      await this.dispatchDbMessage(msg);
    }
  }

  private async dispatchDbMessage(msg: OutboxMessageRow): Promise<void> {
    if (!this.outboxRepo) return;

    const event: DomainEvent = {
      eventId: msg.event_id,
      eventType: msg.event_type,
      occurredAt: msg.occurred_at,
      correlationId: msg.correlation_id ?? undefined,
    };

    try {
      await this.eventPublisher.publish(event);
      await this.outboxRepo.update(msg.id, {
        published: true,
        published_at: new Date(),
      });
    } catch (err: unknown) {
      const newRetryCount = msg.retry_count + 1;
      if (newRetryCount > MAX_RETRIES) {
        this.logger.error(`Moving outbox message ${msg.id} to DLQ after ${MAX_RETRIES} retries`);
        if (this.dlqRepo) {
          await this.dlqRepo.save({
            outbox_message_id: msg.id,
            event_type: msg.event_type,
            payload: msg.payload,
            aggregate_id: msg.aggregate_id,
            correlation_id: msg.correlation_id,
            handler_name: 'OutboxRelay',
            error_message: (err as Error).message,
            error_stack: (err as Error).stack ?? null,
          } as DeadLetterMessageRow);
        }
        await this.outboxRepo.update(msg.id, { published: true, published_at: new Date() });
      } else {
        await this.outboxRepo.update(msg.id, { retry_count: newRetryCount });
      }
    }
  }

  private async processInMemoryOutbox(): Promise<void> {
    const messages = this.inMemoryOutbox.findUnpublished().slice(0, BATCH_SIZE);

    for (const msg of messages) {
      await this.dispatchInMemoryMessage(msg);
    }
  }

  private async dispatchInMemoryMessage(msg: OutboxMessage): Promise<void> {
    const event: DomainEvent = {
      eventId: msg.eventId,
      eventType: msg.eventType,
      occurredAt: msg.occurredAt,
      correlationId: msg.correlationId ?? undefined,
    };

    try {
      await this.eventPublisher.publish(event);
      this.inMemoryOutbox.markPublished(msg.id);
    } catch (err: unknown) {
      this.inMemoryOutbox.incrementRetry(msg.id);
      if (msg.retryCount + 1 > MAX_RETRIES) {
        this.logger.error(`Moving in-memory outbox message ${msg.id} to DLQ after ${MAX_RETRIES} retries`);
        this.inMemoryDlq.add({
          outboxMessageId: msg.id,
          eventType: msg.eventType,
          payload: msg.payload,
          aggregateId: msg.aggregateId,
          correlationId: msg.correlationId,
          handlerName: 'OutboxRelay',
          errorMessage: (err as Error).message,
          errorStack: (err as Error).stack ?? null,
        });
        this.inMemoryOutbox.markPublished(msg.id);
      }
    }
  }
}
