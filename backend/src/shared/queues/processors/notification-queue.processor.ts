import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NOTIFICATION, JOB_NOTIFICATION_PUSH, JOB_NOTIFICATION_IN_APP } from '../queue.constants';
import type { PushNotificationJob, InAppNotificationJob } from '../jobs/notification.jobs';

@Processor(QUEUE_NOTIFICATION)
export class NotificationQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationQueueProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing notification job ${job.name} [${job.id}]`);

    switch (job.name) {
      case JOB_NOTIFICATION_PUSH:
        return this.handlePush(job.data as PushNotificationJob);
      case JOB_NOTIFICATION_IN_APP:
        return this.handleInApp(job.data as InAppNotificationJob);
      default:
        this.logger.warn(`Unknown notification job: ${job.name}`);
    }
  }

  private async handlePush(data: PushNotificationJob): Promise<void> {
    // Phase 13: wire to FCM/APNs push provider
    this.logger.log(`[Push] user=${data.userId} tenant=${data.tenantId} title="${data.title}"`);
  }

  private async handleInApp(data: InAppNotificationJob): Promise<void> {
    // Phase 13: persist via NotificationsService + emit to WebSocket gateway
    this.logger.log(`[InApp] user=${data.userId} tenant=${data.tenantId} type=${data.type}`);
  }
}
