import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OutboxAndDlq004 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE outbox_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}',
        aggregate_id VARCHAR(255),
        correlation_id VARCHAR(255),
        occurred_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        published BOOLEAN NOT NULL DEFAULT FALSE,
        published_at TIMESTAMPTZ,
        retry_count INT NOT NULL DEFAULT 0
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_outbox_unpublished
        ON outbox_messages (published, created_at)
        WHERE NOT published;
    `);

    await queryRunner.query(`
      CREATE TABLE dead_letter_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outbox_message_id UUID NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        aggregate_id VARCHAR(255),
        correlation_id VARCHAR(255),
        handler_name VARCHAR(255) NOT NULL,
        error_message TEXT,
        error_stack TEXT,
        retry_count INT NOT NULL DEFAULT 0,
        max_retries INT NOT NULL DEFAULT 5,
        first_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        resolved_at TIMESTAMPTZ
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_dlq_unresolved
        ON dead_letter_messages (resolved, last_failed_at)
        WHERE NOT resolved;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dlq_unresolved;`);
    await queryRunner.query(`DROP TABLE IF EXISTS dead_letter_messages;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_unpublished;`);
    await queryRunner.query(`DROP TABLE IF EXISTS outbox_messages;`);
  }
}
