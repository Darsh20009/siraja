import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  NOTIFICATION_REPOSITORY,
  INotificationRepository,
} from '../../domain/repositories/notification.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * GetNotificationUseCase
 *
 * Returns a single notification by ID.
 * Ownership enforced: non-admins may only access their own notifications.
 */
@Injectable()
export class GetNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string) {
    const notification = await this.repo.findById(user.tenantId, id);
    if (!notification) throw new NotFoundException('Notification not found.');

    const roles = user.roles as Role[];
    const isAdmin = roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPER_ADMIN);

    if (!isAdmin && notification.recipientId !== user.sub) {
      throw new ForbiddenException('Access denied.');
    }

    return notification;
  }
}
