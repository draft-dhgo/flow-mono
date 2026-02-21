import { EntitySchema } from 'typeorm';

export interface DeadLetterMessageRow {
  id: string;
  outbox_message_id: string;
  event_type: string;
  payload: unknown;
  aggregate_id: string | null;
  correlation_id: string | null;
  handler_name: string;
  error_message: string | null;
  error_stack: string | null;
  retry_count: number;
  max_retries: number;
  first_failed_at: Date;
  last_failed_at: Date;
  resolved: boolean;
  resolved_at: Date | null;
}

export const DeadLetterMessageSchema = new EntitySchema<DeadLetterMessageRow>({
  name: 'dead_letter_message',
  tableName: 'dead_letter_messages',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    outbox_message_id: { type: 'uuid' },
    event_type: { type: 'varchar', length: 100 },
    payload: { type: 'jsonb' },
    aggregate_id: { type: 'varchar', length: 255, nullable: true },
    correlation_id: { type: 'varchar', length: 255, nullable: true },
    handler_name: { type: 'varchar', length: 255 },
    error_message: { type: 'text', nullable: true },
    error_stack: { type: 'text', nullable: true },
    retry_count: { type: 'int', default: 0 },
    max_retries: { type: 'int', default: 5 },
    first_failed_at: { type: 'timestamptz', default: () => 'NOW()' },
    last_failed_at: { type: 'timestamptz', default: () => 'NOW()' },
    resolved: { type: 'boolean', default: false },
    resolved_at: { type: 'timestamptz', nullable: true },
  },
});
