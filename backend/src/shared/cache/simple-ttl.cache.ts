/**
 * Simple in-process TTL cache.
 *
 * A lightweight alternative to Redis for low-cardinality, short-lived
 * computation results (weakness summaries, forecasts, overdue lists).
 * Designed to be replaced with a Redis-backed implementation behind the
 * same interface when the platform scales to multi-instance deployment.
 *
 * Thread-safety: Node.js is single-threaded — no locking needed.
 */
export class SimpleTtlCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly defaultTtlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /** Invalidate all keys that start with the given prefix. */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  /** Purge all expired entries (call periodically to avoid memory leaks in long-running processes). */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  get size(): number {
    return this.store.size;
  }
}
