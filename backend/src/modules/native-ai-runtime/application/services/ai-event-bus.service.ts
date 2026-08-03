import { Injectable } from '@nestjs/common';

export type AiEventType =
  | 'analysis.completed'
  | 'risk.flagged'
  | 'recommendation.issued'
  | 'plan.generated'
  | 'session.created'
  | 'session.closed'
  | 'pipeline.started'
  | 'pipeline.completed'
  | 'pipeline.failed'
  | 'cache.hit'
  | 'cache.miss';

export interface AiRuntimeEvent {
  readonly eventId: string;
  readonly type: AiEventType;
  readonly tenantId: string;
  readonly payload: Record<string, unknown>;
  readonly emittedAt: Date;
}

type EventHandler = (event: AiRuntimeEvent) => void;

/**
 * AiEventBusService — typed synchronous in-process event bus for the
 * Native AI Runtime.
 *
 * Uses a simple listener map (no external broker, no async).
 * Events are dispatched synchronously; listeners run in registration order.
 *
 * Recent events per tenant are kept in a fixed-size ring buffer for
 * diagnostic queries.
 */
@Injectable()
export class AiEventBusService {
  private readonly handlers = new Map<AiEventType, Set<EventHandler>>();
  /** Ring buffer: tenantId → last 50 events. */
  private readonly recentEvents = new Map<string, AiRuntimeEvent[]>();
  private readonly MAX_RECENT = 50;
  private idCounter = 0;

  // ── Emit ──────────────────────────────────────────────────────────────────

  /** Emit an event synchronously to all registered listeners. */
  emit(event: AiRuntimeEvent): void {
    this.bufferEvent(event);
    const listeners = this.handlers.get(event.type);
    if (!listeners) return;
    for (const handler of listeners) {
      handler(event);
    }
  }

  /**
   * Convenience factory: builds an AiRuntimeEvent and emits it.
   */
  dispatch(
    type: AiEventType,
    tenantId: string,
    payload: Record<string, unknown> = {},
  ): void {
    this.emit({
      eventId: `evt_${++this.idCounter}_${Date.now()}`,
      type,
      tenantId,
      payload,
      emittedAt: new Date(),
    });
  }

  // ── Subscribe / unsubscribe ───────────────────────────────────────────────

  /** Register a handler for an event type.  Returns an unsubscribe function. */
  on(type: AiEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.off(type, handler);
  }

  /** Deregister a handler. */
  off(type: AiEventType, handler: EventHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  /**
   * Return recent events for a tenant (most recent first), up to `limit`.
   */
  getRecentEvents(tenantId: string, limit = 20): AiRuntimeEvent[] {
    const buffer = this.recentEvents.get(tenantId) ?? [];
    return buffer.slice(-limit).reverse();
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private bufferEvent(event: AiRuntimeEvent): void {
    const buffer = this.recentEvents.get(event.tenantId) ?? [];
    buffer.push(event);
    if (buffer.length > this.MAX_RECENT) {
      buffer.shift();
    }
    this.recentEvents.set(event.tenantId, buffer);
  }
}
