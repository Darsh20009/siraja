import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from '@database/mongoose/schemas';
import { NOTIFICATION_REPOSITORY } from './domain/repositories/notification.repository.interface';
import { NotificationRepository } from './infrastructure/repositories/notification.repository';
import { NotificationDeliveryService } from './infrastructure/services/notification-delivery.service';
import { NotificationsController } from './infrastructure/controllers/notifications.controller';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.use-case';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications.use-case';
import { GetNotificationUseCase } from './application/use-cases/get-notification.use-case';
import { MarkReadUseCase } from './application/use-cases/mark-read.use-case';
import { MarkAllReadUseCase } from './application/use-cases/mark-all-read.use-case';
import { ArchiveNotificationUseCase } from './application/use-cases/archive-notification.use-case';
import { DeleteNotificationUseCase } from './application/use-cases/delete-notification.use-case';
import { GetUnreadCountUseCase } from './application/use-cases/get-unread-count.use-case';

/**
 * NotificationsModule — Phase 10.
 *
 * Full notification inbox: create, list (with filters), read/unread,
 * mark-all-read, archive, delete. Delivery is orchestrated by
 * NotificationDeliveryService which abstracts IN_APP and EMAIL channels.
 *
 * Exports NOTIFICATION_REPOSITORY so other modules (Attendance, Exams,
 * Assignments, etc.) can fire notifications without circular dependencies.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
  ],
  controllers: [NotificationsController],
  providers: [
    { provide: NOTIFICATION_REPOSITORY, useClass: NotificationRepository },
    NotificationDeliveryService,
    CreateNotificationUseCase,
    ListNotificationsUseCase,
    GetNotificationUseCase,
    MarkReadUseCase,
    MarkAllReadUseCase,
    ArchiveNotificationUseCase,
    DeleteNotificationUseCase,
    GetUnreadCountUseCase,
  ],
  exports: [NOTIFICATION_REPOSITORY, NotificationDeliveryService],
})
export class NotificationsModule {}
