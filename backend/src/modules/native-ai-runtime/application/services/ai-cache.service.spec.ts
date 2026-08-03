import { AiCacheService } from './ai-cache.service';

describe('AiCacheService', () => {
  let cache: AiCacheService;

  beforeEach(() => {
    cache = new AiCacheService();
  });

  // ── set / get ──────────────────────────────────────────────────────────────

  describe('set / get', () => {
    it('stores and retrieves a value within the TTL', () => {
      cache.set('key1', { data: 42 }, 60_000);
      expect(cache.get('key1')).toEqual({ data: 42 });
    });

    it('returns undefined for a missing key', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('returns undefined after TTL expiry (mocked time)', () => {
      const RealDate = Date;
      let fakeNow = 1_000_000;
      jest.spyOn(global, 'Date').mockImplementation((...args: unknown[]) => {
        if (args.length === 0) return new RealDate(fakeNow);
        return new RealDate(...(args as [string | number | Date]));
      });
      (global.Date as unknown as { now: () => number }).now = () => fakeNow;

      cache.set('exp', 'value', 500);
      fakeNow += 1_000; // advance past TTL
      expect(cache.get('exp')).toBeUndefined();

      jest.restoreAllMocks();
    });

    it('overwrites an existing key', () => {
      cache.set('k', 'v1', 60_000);
      cache.set('k', 'v2', 60_000);
      expect(cache.get('k')).toBe('v2');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('removes a stored entry', () => {
      cache.set('del', 'x');
      cache.delete('del');
      expect(cache.get('del')).toBeUndefined();
    });

    it('is a no-op for a non-existent key', () => {
      expect(() => cache.delete('ghost')).not.toThrow();
    });
  });

  // ── buildKey ──────────────────────────────────────────────────────────────

  describe('buildKey', () => {
    it('joins parts with colons', () => {
      expect(cache.buildKey('tenant1', 'student42', 'risk')).toBe('tenant1:student42:risk');
    });

    it('works with a single part', () => {
      expect(cache.buildKey('single')).toBe('single');
    });
  });

  // ── flush ─────────────────────────────────────────────────────────────────

  describe('flush', () => {
    it('clears all entries when called without tenantId', () => {
      cache.set('t1:k1', 'a');
      cache.set('t2:k2', 'b');
      cache.flush();
      expect(cache.get('t1:k1')).toBeUndefined();
      expect(cache.get('t2:k2')).toBeUndefined();
    });

    it('clears only entries matching the tenantId prefix', () => {
      cache.set('t1:k1', 'a');
      cache.set('t2:k2', 'b');
      cache.flush('t1');
      expect(cache.get('t1:k1')).toBeUndefined();
      expect(cache.get('t2:k2')).toBe('b');
    });
  });

  // ── getStats ──────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('tracks hits and misses', () => {
      cache.set('k', 'v');
      cache.get('k');    // hit
      cache.get('miss'); // miss
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.5);
    });

    it('reports hitRate as 0 when no requests have been made', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('tracks totalEntries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.getStats().totalEntries).toBe(2);
    });
  });
});
