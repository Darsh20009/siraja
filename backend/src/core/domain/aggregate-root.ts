import { BaseEntity } from './base.entity';

export interface DomainEvent {
  readonly occurredAt: Date;
}

/**
 * Base aggregate root.
 * Aggregates are the transactional consistency boundary in DDD and are the
 * only entities referenced directly by repositories.
 */
export abstract class AggregateRoot<Id = string> extends BaseEntity<Id> {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this._domainEvents;
    this._domainEvents = [];
    return events;
  }
}
