import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMAIL_PROVIDER, IEmailProvider } from '@shared/email/email-provider.interface';
import { NotificationItem } from '../../domain/repositories/notification.repository.interface';
import {
  NOTIFICATION_REPOSITORY,
  INotificationRepository,
} from '../../domain/repositories/notification.repository.interface';
import { NotificationChannel, NotificationStatus } from '@shared/enums/notification.enum';

/**
 * NotificationDeliveryService
 *
 * Orchestrates multi-channel notification delivery.
 * IN_APP: no external I/O — the document in MongoDB is the delivery
 *         (the client polls or uses long-polling).
 * EMAIL:  delegates to the injected IEmailProvider (SMTP abstraction).
 *
 * Failure in one channel does not prevent delivery on others.
 * Each channel result is written back to the notification's status field.
 *
 * Phase 10: Communication & Notification Platform.
 */
@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: IEmailProvider,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
  ) {}

  async deliver(notification: NotificationItem): Promise<void> {
    switch (notification.channel) {
      case NotificationChannel.IN_APP:
        await this.deliverInApp(notification);
        break;
      case NotificationChannel.EMAIL:
        await this.deliverEmail(notification);
        break;
      default:
        this.logger.warn(`Unknown channel "${(notification as any).channel}" — skipping delivery.`);
    }
  }

  private async deliverInApp(notification: NotificationItem): Promise<void> {
    // In-app delivery is instant: the document is already in MongoDB.
    // Update status to DELIVERED.
    try {
      await this.repo.updateStatus(notification.tenantId, notification.id, NotificationStatus.DELIVERED);
    } catch (err: unknown) {
      this.logger.error(`In-app status update failed for ${notification.id}: ${String(err)}`);
    }
  }

  private async deliverEmail(notification: NotificationItem): Promise<void> {
    // recipientId is a userId — in a real system we'd resolve the email
    // address via UsersModule. For now the caller embeds it in
    // notification.data.recipientEmail as the primary path.
    //
    // Missing recipientEmail is treated as FAILED (not DELIVERED) so that
    // the condition is observable, re-triable, and does not produce false
    // "delivered" state in the audit trail.
    const recipientEmail = notification.data?.recipientEmail as string | undefined;

    if (!recipientEmail) {
      this.logger.error(
        `Email notification ${notification.id} (type=${notification.type}) cannot be delivered: ` +
          `no recipientEmail found in notification.data. ` +
          `Set notification.data.recipientEmail at creation time, or wire UsersModule to ` +
          `resolve the address from recipientId="${notification.recipientId}" automatically.`,
      );
      await this.repo.updateStatus(notification.tenantId, notification.id, NotificationStatus.FAILED);
      return;
    }

    try {
      await this.emailProvider.send({
        to: recipientEmail,
        subject: notification.title,
        text: notification.body,
      });
      await this.repo.updateStatus(notification.tenantId, notification.id, NotificationStatus.DELIVERED);
    } catch (err: unknown) {
      this.logger.error(`Email delivery failed for ${notification.id}: ${String(err)}`);
      await this.repo.updateStatus(notification.tenantId, notification.id, NotificationStatus.FAILED);
    }
  }
}
