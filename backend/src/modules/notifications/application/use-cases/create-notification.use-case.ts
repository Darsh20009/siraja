import { Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  NOTIFICATION_REPOSITORY,
  INotificationRepository,
} from '../../domain/repositories/notification.repository.interface';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationChannel, NotificationPriority } from '@shared/enums/notification.enum';
import { NotificationDeliveryService } from '../../infrastructure/services/notification-delivery.service';
import { Role } from '@shared/enums/roles.enum';

/**
 * CreateNotificationUseCase
 *
 * Sends a notification to one recipient via the specified channel.
 * RBAC: NOTIFICATIONS.CREATE (Sheikh, Supervisor, Tenant Admin).
 */
@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  async execute(user: AccessTokenPayload, dto: CreateNotificationDto) {
    const roles = user.roles as Role[];

    // Sheikh / Supervisor: only tenant-scoped delivery (already enforced by RBAC guard).
    // Tenant Admin: full tenant access. Super Admin bypasses guards.
    void roles; // RBAC checked at controller level

    const notification = await this.repo.create({
      tenantId: user.tenantId,
      recipientId: dto.recipientId,
      type: dto.type,
      channel: dto.channel ?? NotificationChannel.IN_APP,
      priority: dto.priority ?? NotificationPriority.NORMAL,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      deepLink: dto.deepLink,
      templateId: dto.templateId,
      actorId: user.sub,
    });

    // Fire-and-forget delivery; errors are logged, not thrown.
    void this.delivery.deliver(notification);

    return notification;
  }
}
