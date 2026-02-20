import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DomainEvents002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE domain_events (
        event_id UUID PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}',
        aggregate_id VARCHAR(255),
        correlation_id VARCHAR(255),
        occurred_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_domain_events_event_type ON domain_events (event_type);`);
    await queryRunner.query(`CREATE INDEX idx_domain_events_aggregate_id ON domain_events (aggregate_id);`);
    await queryRunner.query(`CREATE INDEX idx_domain_events_occurred_at ON domain_events (occurred_at);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_domain_events_occurred_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_domain_events_aggregate_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_domain_events_event_type;`);
    await queryRunner.query(`DROP TABLE IF EXISTS domain_events;`);
  }
}
