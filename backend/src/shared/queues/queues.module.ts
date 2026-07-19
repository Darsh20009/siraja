import { Global, Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_AI, QUEUE_EMAIL, QUEUE_NOTIFICATION, QUEUE_REPORT, QUEUE_AUDIO } from './queue.constants';
import { QueueService } from './queue.service';
import { EmailQueueProcessor } from './processors/email-queue.processor';
import { AiQueueProcessor } from './processors/ai-queue.processor';
import { NotificationQueueProcessor } from './processors/notification-queue.processor';
import { ReportQueueProcessor } from './processors/report-queue.processor';
import { AudioQueueProcessor } from './processors/audio-queue.processor';

const logger = new Logger('QueuesModule');

const QUEUE_NAMES = [QUEUE_AI, QUEUE_EMAIL, QUEUE_NOTIFICATION, QUEUE_REPORT, QUEUE_AUDIO];

/**
 * QueuesModule — global BullMQ queue infrastructure.
 *
 * Graceful fallback:
 *   REDIS_URL set   → all 5 queues registered with processors active
 *   REDIS_URL unset → BullMQ imports skipped, QueueService provides no-op add()
 *                     that logs a warning instead of throwing
 *
 * Marked @Global so every module can inject QueueService without
 * importing QueuesModule explicitly.
 */
@Global()
@Module({})
export class QueuesModule {
  static forRootAsync() {
    const rawUrl = process.env.REDIS_URL;
    const redisUrl = rawUrl && /^rediss?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : null;

    if (!redisUrl) {
      if (rawUrl && !redisUrl) {
        logger.warn(
          'REDIS_URL is set but does not look like a valid Redis URL ' +
            '(expected rediss://… or redis://…) — BullMQ queues disabled. ' +
            'Update the secret to a plain rediss://user:pass@host:port URL.',
        );
      } else {
        logger.warn(
          'REDIS_URL not set — BullMQ queues disabled. ' +
            'All queue operations will be no-ops until Redis is configured.',
        );
      }

      // Provide a no-op QueueService that satisfies DI without BullMQ
      return {
        module: QueuesModule,
        providers: [
          {
            provide: QueueService,
            useFactory: () => new QueueService(null, null, null, null, null),
          },
        ],
        exports: [QueueService],
      };
    }

    return {
      module: QueuesModule,
      imports: [
        BullModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            connection: {
              url: config.get<string>('redis.url', ''),
            },
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 1000 },
              removeOnComplete: { count: 100 },
              removeOnFail: { count: 200 },
            },
          }),
        }),
        ...QUEUE_NAMES.map((name) => BullModule.registerQueue({ name })),
      ],
      providers: [
        QueueService,
        EmailQueueProcessor,
        AiQueueProcessor,
        NotificationQueueProcessor,
        ReportQueueProcessor,
        AudioQueueProcessor,
      ],
      exports: [QueueService],
    };
  }
}
