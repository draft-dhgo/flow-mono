import { Injectable, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { InMemoryDeadLetterQueue, DeadLetterEntry } from './in-memory-dead-letter-queue.js';
import type { DeadLetterMessageRow } from './typeorm/dead-letter-message.schema.js';

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);

  constructor(
    private readonly dlqRepo: Repository<DeadLetterMessageRow> | null,
    private readonly inMemoryDlq: InMemoryDeadLetterQueue,
  ) {}

  async listUnresolved(): Promise<DeadLetterEntry[] | DeadLetterMessageRow[]> {
    if (this.dlqRepo) {
      return this.dlqRepo.find({
        where: { resolved: false },
        order: { last_failed_at: 'ASC' },
      });
    }
    return this.inMemoryDlq.findUnresolved();
  }

  async resolve(id: string): Promise<void> {
    if (this.dlqRepo) {
      await this.dlqRepo.update(id, {
        resolved: true,
        resolved_at: new Date(),
      });
      this.logger.log(`DLQ entry ${id} resolved (DB)`);
    } else {
      this.inMemoryDlq.markResolved(id);
      this.logger.log(`DLQ entry ${id} resolved (in-memory)`);
    }
  }

  async retry(id: string): Promise<void> {
    if (this.dlqRepo) {
      await this.dlqRepo
        .createQueryBuilder()
        .update()
        .set({
          retry_count: () => 'retry_count + 1',
          last_failed_at: new Date(),
        })
        .where('id = :id', { id })
        .execute();
      this.logger.log(`DLQ entry ${id} retried (DB)`);
    } else {
      this.inMemoryDlq.incrementRetry(id);
      this.logger.log(`DLQ entry ${id} retried (in-memory)`);
    }
  }
}
