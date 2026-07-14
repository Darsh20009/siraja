import { CacheService } from './cache.service';
import { REDIS_CLIENT } from './redis.constants';

// Helper: build a service with a real or null Redis client
function buildService(redis: unknown = null): CacheService {
  const service = new CacheService(redis as never);
  return service;
}

// Minimal Redis mock with just the methods CacheService uses
function mockRedis(overrides: Record<string, jest.Mock> = {}) {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    pexpire: jest.fn().mockResolvedValue(1),
    pttl: jest.fn().mockResolvedValue(60_000),
    ping: jest.fn().mockResolvedValue('PONG'),
    scan: jest.fn().mockResolvedValue(['0', []]),
    ...overrides,
  };
}

describe('CacheService — in-process fallback (no Redis)', () => {
  let service: CacheService;

  beforeEach(() => {
    service = buildService(null);
  });

  it('reports backend=memory when Redis is null', () => {
    expect(service.backend).toBe('memory');
  });

  it('ping() returns false when Redis is null', async () => {
    expect(await service.ping()).toBe(false);
  });

  it('set + get round-trip works via in-process fallback', async () => {
    await service.set('k1', { score: 42 }, 60_000);
    const result = await service.get<{ score: number }>('k1');
    expect(result).toEqual({ score: 42 });
  });

  it('get() returns undefined for missing key', async () => {
    expect(await service.get('missing')).toBeUndefined();
  });

  it('delete() removes key from fallback', async () => {
    await service.set('del-me', 'value', 60_000);
    await service.delete('del-me');
    expect(await service.get('del-me')).toBeUndefined();
  });

  it('invalidatePattern() removes keys by prefix in fallback', async () => {
    await service.set('weakness:t1:s1', [1, 2], 60_000);
    await service.set('weakness:t1:s2', [3, 4], 60_000);
    await service.set('forecast:t1:s1', {}, 60_000);
    await service.invalidatePattern('weakness:*');
    expect(await service.get('weakness:t1:s1')).toBeUndefined();
    expect(await service.get('weakness:t1:s2')).toBeUndefined();
    expect(await service.get('forecast:t1:s1')).toBeDefined();
  });

  it('getOrSet() computes and caches on miss', async () => {
    const compute = jest.fn().mockResolvedValue({ result: 99 });
    const r1 = await service.getOrSet('key', 60_000, compute);
    const r2 = await service.getOrSet('key', 60_000, compute);
    expect(r1).toEqual({ result: 99 });
    expect(r2).toEqual({ result: 99 });
    expect(compute).toHaveBeenCalledTimes(1); // cached after first call
  });

  it('increment() returns 1 always when Redis is null', async () => {
    expect(await service.increment('rate:user1', 60_000)).toBe(1);
    expect(await service.increment('rate:user1', 60_000)).toBe(1);
  });

  it('metrics start at zero', () => {
    const m = service.getMetrics();
    expect(m.hits).toBe(0);
    expect(m.misses).toBe(0);
    expect(m.errors).toBe(0);
  });

  it('metrics.hits and misses are tracked', async () => {
    await service.set('hit-key', 'v', 60_000);
    await service.get('hit-key');     // hit
    await service.get('miss-key');    // miss
    const m = service.getMetrics();
    expect(m.hits).toBeGreaterThanOrEqual(1);
    expect(m.misses).toBeGreaterThanOrEqual(1);
  });
});

describe('CacheService — Redis backend', () => {
  let service: CacheService;
  let redis: ReturnType<typeof mockRedis>;

  beforeEach(() => {
    redis = mockRedis();
    service = buildService(redis);
  });

  it('reports backend=redis when Redis client provided', () => {
    expect(service.backend).toBe('redis');
  });

  it('ping() returns true when Redis responds PONG', async () => {
    expect(await service.ping()).toBe(true);
  });

  it('ping() returns false when Redis throws', async () => {
    redis.ping.mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await service.ping()).toBe(false);
  });

  it('set() calls redis.set with PX expiry', async () => {
    await service.set('k', { v: 1 }, 5000);
    expect(redis.set).toHaveBeenCalledWith('k', JSON.stringify({ v: 1 }), 'PX', 5000);
  });

  it('get() returns parsed value on cache hit', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ v: 42 }));
    const result = await service.get<{ v: number }>('k');
    expect(result).toEqual({ v: 42 });
  });

  it('get() returns undefined on cache miss', async () => {
    redis.get.mockResolvedValue(null);
    expect(await service.get('k')).toBeUndefined();
  });

  it('get() falls back to in-process cache on Redis error', async () => {
    redis.get.mockRejectedValue(new Error('connection lost'));
    expect(await service.get('k')).toBeUndefined();
    expect(service.getMetrics().errors).toBe(1);
  });

  it('delete() calls redis.del', async () => {
    await service.delete('mykey');
    expect(redis.del).toHaveBeenCalledWith('mykey');
  });

  it('increment() calls redis.incr', async () => {
    redis.incr.mockResolvedValue(3);
    const val = await service.increment('counter', 60_000);
    expect(val).toBe(3);
    expect(redis.incr).toHaveBeenCalledWith('counter');
  });

  it('increment() sets expiry on first call (value=1)', async () => {
    redis.incr.mockResolvedValue(1);
    await service.increment('new-counter', 60_000);
    expect(redis.pexpire).toHaveBeenCalledWith('new-counter', 60_000);
  });

  it('invalidatePattern() uses SCAN + DEL', async () => {
    redis.scan
      .mockResolvedValueOnce(['42', ['weakness:a', 'weakness:b']])
      .mockResolvedValueOnce(['0', []]);
    redis.del = jest.fn().mockResolvedValue(2);
    await service.invalidatePattern('weakness:*');
    expect(redis.del).toHaveBeenCalledWith('weakness:a', 'weakness:b');
  });
});
