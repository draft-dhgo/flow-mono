import { EntitySchema } from 'typeorm';

export interface DomainEventRow {
  event_id: string;
  event_type: string;
  payload: unknown;
  aggregate_id: string | null;
  correlation_id: string | null;
  occurred_at: Date;
  created_at: Date;
}

export const DomainEventSchema = new EntitySchema<DomainEventRow>({
  name: 'domain_event',
  tableName: 'domain_events',
  columns: {
    event_id: { type: 'uuid', primary: true },
    event_type: { type: 'varchar', length: 100 },
    payload: { type: 'jsonb', default: '{}' },
    aggregate_id: { type: 'varchar', length: 255, nullable: true },
    correlation_id: { type: 'varchar', length: 255, nullable: true },
    occurred_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', default: () => 'NOW()' },
  },
});
