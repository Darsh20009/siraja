import { Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  NOTIFICATION_REPOSITORY,
  INotificationRepository,
} from '../../domain/repositories/notification.repository.interface';
import { ListNotificationsDto } from '../dto/list-notifications.dto';
import { Role } from '@shared/enums/roles.enum';

/**
 * ListNotificationsUseCase
 *
 * Returns the authenticated user's own notifications (inbox).
 * Tenant Admin / Super Admin can also query for any recipientId.
 *
 * RBAC: NOTIFICATIONS.READ — scoped to the caller's own inbox unless
 * they are Tenant Admin or higher.
 */
@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
  ) {}

  async execute(user: AccessTokenPayload, dto: ListNotificationsDto, recipientId?: string) {
    const roles = user.roles as Role[];
    const isAdmin =
      roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPER_ADMIN);

    // Non-admins always see only their own notifications.
    const effectiveRecipientId = isAdmin && recipientId ? recipientId : user.sub;

    return this.repo.findAll(
      user.tenantId,
      {
        recipientId: effectiveRecipientId,
        type: dto.type,
        channel: dto.channel,
        isRead: dto.isRead,
        isArchived: dto.isArchived ?? false,
        priority: dto.priority,
      },
      dto.page,
      dto.limit,
    );
  }
}
