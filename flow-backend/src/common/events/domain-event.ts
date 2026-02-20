import { v4 as uuidv4 } from 'uuid';

export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly correlationId?: string;
}

export abstract class BaseDomainEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly correlationId?: string;

  protected constructor(eventType: string, correlationId?: string) {
    this.eventId = uuidv4();
    this.eventType = eventType;
    this.occurredAt = new Date();
    this.correlationId = correlationId;
  }
}
