import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { SimpleTtlCache } from '@shared/cache/simple-ttl.cache';

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  backend: 'redis' | 'memory';
}

/**
 * CacheService — distributed cache with in-process fallback.
 *
 * When Redis is available all operations go through ioredis.
 * When Redis is unavailable (null client or network error) operations
 * silently fall back to a per-instance SimpleTtlCache so the app stays
 * functional without any caching coordination across pods.
 *
 * All TTL arguments are in **milliseconds** for consistency with SimpleTtlCache.
 *
 * Cache key namespacing convention:
 *   <namespace>:<tenantId>:<...discriminators>
 *   e.g. "weakness:t123:s456", "ai:t123:insight:memorization"
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly fallback = new SimpleTtlCache<unknown>(60_000);
  private readonly metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    backend: 'memory',
  };

  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {
    this.metrics.backend = redis ? 'redis' : 'memory';
  }

  // ─── Core Operations ────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.redis) {
      const val = this.fallback.get(key) as T | undefined;
      val !== undefined ? this.metrics.hits++ : this.metrics.misses++;
      return val;
    }
    try {
      const raw = await this.redis.get(key);
      if (raw === null) {
        this.metrics.misses++;
        return undefined;
      }
      this.metrics.hits++;
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      this.metrics.errors++;
      this.logger.warn(`Cache GET error (${key}): ${(err as Error).message} — using fallback`);
      const val = this.fallback.get(key) as T | undefined;
      return val;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (!this.redis) {
      this.fallback.set(key, value, ttlMs);
      return;
    }
    try {
      await this.redis.set(key, JSON.stringify(value), 'PX', ttlMs);
    } catch (err: unknown) {
      this.metrics.errors++;
      this.logger.warn(`Cache SET error (${key}): ${(err as Error).message} — using fallback`);
      this.fallback.set(key, value, ttlMs);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) {
      this.fallback.delete(key);
      return;
    }
    try {
      await this.redis.del(key);
    } catch (err: unknown) {
      this.metrics.errors++;
      this.logger.warn(`Cache DEL error (${key}): ${(err as Error).message}`);
      this.fallback.delete(key);
    }
  }

  /**
   * Invalidate all keys matching a glob pattern in Redis, or prefix in fallback.
   * Redis: uses SCAN + DEL (safe for large keyspaces, does not block).
   * Fallback: prefix scan on the in-process Map.
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.redis) {
      this.fallback.invalidatePrefix(pattern.replace('*', ''));
      return;
    }
    try {
      const keys = await this.scanKeys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Cache: invalidated ${keys.length} keys matching "${pattern}"`);
      }
    } catch (err: unknown) {
      this.metrics.errors++;
      this.logger.warn(`Cache invalidatePattern error: ${(err as Error).message}`);
      this.fallback.invalidatePrefix(pattern.replace('*', ''));
    }
  }

  /**
   * Increment a counter key by 1 (for rate-limiting / metrics).
   * Returns the new value. Sets expiry on first call.
   */
  async increment(key: string, ttlMs: number): Promise<number> {
    if (!this.redis) return 1; // no-op counter for non-Redis env
    try {
      const val = await this.redis.incr(key);
      if (val === 1) {
        await this.redis.pexpire(key, ttlMs);
      }
      return val;
    } catch {
      this.metrics.errors++;
      return 1;
    }
  }

  /**
   * TTL remaining in ms. -1 if no expiry, -2 if key not found.
   */
  async ttlMs(key: string): Promise<number> {
    if (!this.redis) return -1;
    try {
      return await this.redis.pttl(key);
    } catch {
      return -1;
    }
  }

  // ─── Convenience ────────────────────────────────────────────────────────

  /**
   * Get or compute: returns cached value if present; otherwise computes,
   * caches, and returns the result.
   */
  async getOrSet<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await compute();
    await this.set(key, value, ttlMs);
    return value;
  }

  // ─── Diagnostics ────────────────────────────────────────────────────────

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  async ping(): Promise<boolean> {
    if (!this.redis) return false;
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  get backend(): 'redis' | 'memory' {
    return this.metrics.backend;
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await this.redis!.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }
}
