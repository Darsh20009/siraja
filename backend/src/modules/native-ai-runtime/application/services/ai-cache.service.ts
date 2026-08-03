import { Injectable } from '@nestjs/common';
import type { CacheStats } from '../../domain/entities/ai-metrics.entity';
import { PipelineRules } from '../../domain/rules/pipeline.rules';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * AiCacheService — deterministic TTL-based in-memory cache for AI outputs.
 *
 * All AI computation is deterministic so cached results are always safe
 * to reuse within the TTL window.  This avoids re-running expensive
 * in-process calculations on every request for the same inputs.
 *
 * Thread safety: Node.js is single-threaded; no locking required.
 */
@Injectable()
export class AiCacheService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly store = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  // ── Core operations ──────────────────────────────────────────────────────

  /** Store a value with an optional TTL (defaults to DEFAULT_CACHE_TTL_MS). */
  set<T>(key: string, value: T, ttlMs: number = PipelineRules.DEFAULT_CACHE_TTL_MS): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /**
   * Retrieve a cached value.  Returns undefined on miss or expiry.
   * Expired entries are evicted lazily on read.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.evictions++;
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value as T;
  }

  /** Remove a single entry. */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Build a deterministic cache key from a list of string parts.
   * Example: buildKey('tenant1', 'student42', 'risk') → 'tenant1:student42:risk'
   */
  buildKey(...parts: string[]): string {
    return parts.join(':');
  }

  /**
   * Clear entries matching an optional tenantId prefix.
   * Passing no argument clears the entire cache.
   */
  flush(tenantId?: string): void {
    if (!tenantId) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(tenantId)) {
        this.store.delete(key);
      }
    }
  }

  /** Return current cache statistics. */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      totalEntries: this.store.size,
      expiredEvictions: this.evictions,
    };
  }

  /** Reset hit/miss counters (for testing). */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
}
