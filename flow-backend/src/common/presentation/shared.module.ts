import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { EventPublisher, UnitOfWork } from '../ports/index.js';
import { TransactionalEventPublisher } from '../infra/transactional-event-publisher.js';
import { InMemoryOutbox } from '../infra/in-memory-outbox.js';
import { InMemoryDeadLetterQueue } from '../infra/in-memory-dead-letter-queue.js';
import { TypeOrmUnitOfWork } from '../infra/typeorm/typeorm-unit-of-work.js';
import { InMemoryUnitOfWork } from '../infra/in-memory-unit-of-work.js';
import { OutboxRelay } from '../infra/outbox-relay.js';
import { DeadLetterQueueService } from '../infra/dead-letter-queue-service.js';
import { InMemoryEventPublisher } from '../infra/in-memory-event-publisher.js';
import { DomainEventSchema } from '../infra/typeorm/domain-event.schema.js';
import { OutboxMessageSchema } from '../infra/typeorm/outbox-message.schema.js';
import { DeadLetterMessageSchema } from '../infra/typeorm/dead-letter-message.schema.js';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';
import { DomainExceptionFilter } from './filters/domain-exception.filter.js';
import { ApplicationExceptionFilter } from './filters/application-exception.filter.js';

@Global()
@Module({
  providers: [
    InMemoryOutbox,
    InMemoryDeadLetterQueue,
    {
      provide: UnitOfWork,
      useFactory: (dataSource?: DataSource) => {
        if (dataSource?.isInitialized) {
          return new TypeOrmUnitOfWork(dataSource);
        }
        return new InMemoryUnitOfWork();
      },
      inject: [{ token: DataSource, optional: true }],
    },
    {
      provide: EventPublisher,
      useFactory: (dataSource: DataSource | undefined, inMemoryOutbox: InMemoryOutbox) => {
        const outboxRepo = dataSource?.isInitialized
          ? dataSource.getRepository(OutboxMessageSchema)
          : null;
        const domainEventRepo = dataSource?.isInitialized
          ? dataSource.getRepository(DomainEventSchema)
          : null;
        // PersistentEventPublisher behavior preserved via domain_events table write in inner publisher
        void domainEventRepo; // domain events are logged by the inner InMemoryEventPublisher handlers
        return new TransactionalEventPublisher(outboxRepo, inMemoryOutbox);
      },
      inject: [
        { token: DataSource, optional: true },
        InMemoryOutbox,
      ],
    },
    {
      provide: OutboxRelay,
      useFactory: (
        dataSource: DataSource | undefined,
        inMemoryOutbox: InMemoryOutbox,
        eventPublisher: EventPublisher,
        inMemoryDlq: InMemoryDeadLetterQueue,
      ) => {
        const outboxRepo = dataSource?.isInitialized
          ? dataSource.getRepository(OutboxMessageSchema)
          : null;
        const dlqRepo = dataSource?.isInitialized
          ? dataSource.getRepository(DeadLetterMessageSchema)
          : null;
        // OutboxRelay needs the inner InMemoryEventPublisher for dispatch
        const innerPublisher = new InMemoryEventPublisher();
        return new OutboxRelay(outboxRepo, inMemoryOutbox, innerPublisher, dlqRepo, inMemoryDlq);
      },
      inject: [
        { token: DataSource, optional: true },
        InMemoryOutbox,
        EventPublisher,
        InMemoryDeadLetterQueue,
      ],
    },
    {
      provide: DeadLetterQueueService,
      useFactory: (dataSource: DataSource | undefined, inMemoryDlq: InMemoryDeadLetterQueue) => {
        const dlqRepo = dataSource?.isInitialized
          ? dataSource.getRepository(DeadLetterMessageSchema)
          : null;
        return new DeadLetterQueueService(dlqRepo, inMemoryDlq);
      },
      inject: [
        { token: DataSource, optional: true },
        InMemoryDeadLetterQueue,
      ],
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ApplicationExceptionFilter,
    },
  ],
  exports: [EventPublisher, UnitOfWork],
})
export class SharedModule {}
