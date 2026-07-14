import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS } from '../events.constants';
import { UserRegisteredEvent, NotificationCreatedEvent } from '../domain.events';
import { QueueService } from '@shared/queues/queue.service';
import { JOB_EMAIL_WELCOME, JOB_EMAIL_NOTIFICATION, QUEUE_EMAIL } from '@shared/queues/queue.constants';

/**
 * EmailEventListener — translates domain events into email queue jobs.
 *
 * Runs asynchronously after the use-case returns. If Redis/queues are
 * unavailable, QueueService logs a warning and falls back silently.
 */
@Injectable()
export class EmailEventListener {
  private readonly logger = new Logger(EmailEventListener.name);

  constructor(private readonly queueService: QueueService) {}

  @OnEvent(EVENTS.USER_REGISTERED)
  async onUserRegistered(event: UserRegisteredEvent): Promise<void> {
    this.logger.debug(`Queuing welcome email for user ${event.userId}`);
    await this.queueService.add(QUEUE_EMAIL, JOB_EMAIL_WELCOME, {
      to: event.email,
      fullName: event.fullName,
      tenantName: event.tenantName,
      loginUrl: event.loginUrl,
    });
  }

  @OnEvent(EVENTS.NOTIFICATION_CREATED)
  async onNotificationCreated(event: NotificationCreatedEvent): Promise<void> {
    if (!event.deliverViaEmail || !event.recipientEmail) return;
    this.logger.debug(`Queuing notification email for user ${event.userId}`);
    await this.queueService.add(QUEUE_EMAIL, JOB_EMAIL_NOTIFICATION, {
      to: event.recipientEmail,
      tenantName: '',
      title: event.title,
      body: event.body,
    });
  }
}
