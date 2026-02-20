import type { DomainEvent } from '../events/domain-event.js';
import type { EventHandler } from '../ports/event-publisher.js';
import { EventPublisher } from '../ports/event-publisher.js';

export class InMemoryEventPublisher extends EventPublisher {
  private readonly handlers = new Map<string, EventHandler[]>();
  private readonly publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
    const handlers = this.handlers.get(event.eventType) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler]);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, existing.filter((h) => h !== handler));
  }

  getPublishedEvents(): ReadonlyArray<DomainEvent> {
    return [...this.publishedEvents];
  }

  clear(): void {
    this.publishedEvents.length = 0;
    this.handlers.clear();
  }
}
