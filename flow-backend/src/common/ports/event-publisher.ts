import type { DomainEvent } from '../events/domain-event.js';

export type EventHandler = (event: DomainEvent) => Promise<void>;

export abstract class EventPublisher {
  abstract publish(event: DomainEvent): Promise<void>;
  abstract publishAll(events: DomainEvent[]): Promise<void>;
  abstract subscribe(eventType: string, handler: EventHandler): void;
  abstract unsubscribe(eventType: string, handler: EventHandler): void;
}
