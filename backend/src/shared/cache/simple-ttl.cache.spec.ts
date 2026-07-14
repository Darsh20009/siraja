import { SimpleTtlCache } from './simple-ttl.cache';

describe('SimpleTtlCache', () => {
  let cache: SimpleTtlCache<string>;

  beforeEach(() => {
    cache = new SimpleTtlCache(1000); // 1 second default TTL
  });

  describe('set / get', () => {
    it('returns the stored value before expiry', () => {
      cache.set('k', 'hello');
      expect(cache.get('k')).toBe('hello');
    });

    it('returns undefined for unknown keys', () => {
      expect(cache.get('missing')).toBeUndefined();
    });

    it('returns undefined after TTL expires', () => {
      jest.useFakeTimers();
      cache.set('k', 'value', 500);
      jest.advanceTimersByTime(501);
      expect(cache.get('k')).toBeUndefined();
      jest.useRealTimers();
    });

    it('honours per-entry TTL override over default', () => {
      jest.useFakeTimers();
      cache.set('a', 'short', 200);
      cache.set('b', 'long', 2000);
      jest.advanceTimersByTime(500);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('long');
      jest.useRealTimers();
    });

    it('overwrites existing entries', () => {
      cache.set('k', 'first');
      cache.set('k', 'second');
      expect(cache.get('k')).toBe('second');
    });
  });

  describe('delete', () => {
    it('removes a key', () => {
      cache.set('k', 'v');
      cache.delete('k');
      expect(cache.get('k')).toBeUndefined();
    });
  });

  describe('invalidatePrefix', () => {
    it('removes all keys matching the prefix', () => {
      cache.set('user:1', 'a');
      cache.set('user:2', 'b');
      cache.set('tenant:1', 'c');
      cache.invalidatePrefix('user:');
      expect(cache.get('user:1')).toBeUndefined();
      expect(cache.get('user:2')).toBeUndefined();
      expect(cache.get('tenant:1')).toBe('c');
    });
  });

  describe('purgeExpired', () => {
    it('removes expired entries and keeps live ones', () => {
      jest.useFakeTimers();
      cache.set('short', 'x', 100);
      cache.set('long', 'y', 5000);
      jest.advanceTimersByTime(200);
      cache.purgeExpired();
      expect(cache.size).toBe(1);
      expect(cache.get('long')).toBe('y');
      jest.useRealTimers();
    });
  });

  describe('size', () => {
    it('reflects the number of stored entries', () => {
      expect(cache.size).toBe(0);
      cache.set('a', '1');
      cache.set('b', '2');
      expect(cache.size).toBe(2);
    });
  });
});
