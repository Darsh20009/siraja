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

        // Validate that the URL is a recognisable Redis URL before passing it
        // to ioredis. If the value is anything other than a redis:// or
        // rediss:// URL (e.g. an accidental text value stored in the secret),
        // log a warning and fall back to in-process cache exactly as if the
        // variable were unset.
        const trimmed = url.trim();
        if (!/^rediss?:\/\//i.test(trimmed)) {
          logger.warn(
            'REDIS_URL does not look like a valid Redis URL ' +
            '(expected rediss://… or redis://…). ' +
            'Falling back to in-process cache.',
          );
          return null;
        }
        const normalizedUrl = trimmed;

        let client: Redis;
        try {
          client = new Redis(normalizedUrl, {
            lazyConnect: true,
            enableReadyCheck: true,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
              if (times > 5) {
                logger.error('Redis: too many reconnect attempts — giving up.');
                return null;
              }
              return Math.min(times * 200, 2000);
            },
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(
            `Redis URL could not be parsed ("${msg}"). ` +
            `Expected format: rediss://default:<password>@<host>:<port>  ` +
            `Falling back to in-process cache.`,
          );
          return null;
        }

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
