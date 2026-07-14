import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';

/**
 * SystemModule — operational health and monitoring.
 *
 * Provides GET /api/v1/system/health/detailed covering MongoDB, Redis,
 * BullMQ queues, storage, email, AI, and system resource metrics.
 *
 * CacheService and QueueService are injected via their global modules
 * (RedisModule and QueuesModule), so no explicit imports are needed here.
 */
@Module({
  controllers: [SystemController],
})
export class SystemModule {}
