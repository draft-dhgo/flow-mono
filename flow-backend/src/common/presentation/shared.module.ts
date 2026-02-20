import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { EventPublisher } from '../ports/index.js';
import { PersistentEventPublisher } from '../infra/persistent-event-publisher.js';
import { DomainEventSchema } from '../infra/typeorm/domain-event.schema.js';
import { DomainExceptionFilter } from './filters/domain-exception.filter.js';
import { ApplicationExceptionFilter } from './filters/application-exception.filter.js';

@Global()
@Module({
  providers: [
    {
      provide: EventPublisher,
      useFactory: (dataSource?: DataSource) => {
        const repo = dataSource?.isInitialized
          ? dataSource.getRepository(DomainEventSchema)
          : null;
        return new PersistentEventPublisher(repo ?? null);
      },
      inject: [{ token: DataSource, optional: true }],
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
  exports: [EventPublisher],
})
export class SharedModule {}
