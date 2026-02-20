import type { DomainEvent } from './events/domain-event.js';

export abstract class AggregateRoot<TId = unknown> {
  protected _version: number = 0;
  private _domainEvents: DomainEvent[] = [];

  abstract get id(): TId;

  get version(): number {
    return this._version;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  getDomainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  protected incrementVersion(): void {
    this._version++;
  }

  protected setVersion(version: number): void {
    if (!Number.isInteger(version) || version < 0) {
      throw new Error('Version must be a non-negative integer');
    }
    this._version = version;
  }
}
