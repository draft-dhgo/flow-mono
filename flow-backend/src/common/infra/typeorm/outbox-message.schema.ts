import { EntitySchema } from 'typeorm';

export interface OutboxMessageRow {
  id: string;
  event_id: string;
  event_type: string;
  payload: unknown;
  aggregate_id: string | null;
  correlation_id: string | null;
  occurred_at: Date;
  created_at: Date;
  published: boolean;
  published_at: Date | null;
  retry_count: number;
}

export const OutboxMessageSchema = new EntitySchema<OutboxMessageRow>({
  name: 'outbox_message',
  tableName: 'outbox_messages',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    event_id: { type: 'uuid' },
    event_type: { type: 'varchar', length: 100 },
    payload: { type: 'jsonb', default: '{}' },
    aggregate_id: { type: 'varchar', length: 255, nullable: true },
    correlation_id: { type: 'varchar', length: 255, nullable: true },
    occurred_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', default: () => 'NOW()' },
    published: { type: 'boolean', default: false },
    published_at: { type: 'timestamptz', nullable: true },
    retry_count: { type: 'int', default: 0 },
  },
});
