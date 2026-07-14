import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { CacheService } from './cache.service';

const logger = new Logger('RedisModule');

/**
 * RedisModule — global module providing a shared ioredis client and CacheService.
 *
 * Graceful fallback:
 *   REDIS_URL set   → real Redis connection, all cache/queue features enabled
 *   REDIS_URL unset → REDIS_CLIENT is null, CacheService falls back to in-process
 *                     SimpleTtlCache, queues log warnings and are disabled.
 *
 * Marked @Global so every module can inject CacheService without importing RedisModule.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<Redis | null> => {
        const url = config.get<string>('redis.url', '');
        if (!url) {
          logger.warn(
            'REDIS_URL is not set — Redis is disabled. ' +
              'CacheService will use in-process fallback. ' +
              'Queues and distributed rate-limiting will be unavailable.',
          );
          return null;
        }

        const client = new Redis(url, {
          lazyConnect: true,
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 5) {
              logger.error('Redis: too many reconnect attempts — giving up.');
              return null; // stop retrying
            }
            return Math.min(times * 200, 2000);
          },
        });

        try {
          await client.connect();
          logger.log('Redis connected ✓');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(`Redis connection failed: ${msg}. Falling back to in-process cache.`);
          return null;
        }

        client.on('error', (err: Error) =>
          logger.error(`Redis error: ${err.message}`),
        );
        client.on('reconnecting', () => logger.warn('Redis: reconnecting…'));

        return client;
      },
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, CacheService],
})
export class RedisModule {}
