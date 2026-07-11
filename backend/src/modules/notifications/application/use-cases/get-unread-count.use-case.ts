import { Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  NOTIFICATION_REPOSITORY,
  INotificationRepository,
} from '../../domain/repositories/notification.repository.interface';

/**
 * GetUnreadCountUseCase — returns the number of unread notifications
 * for the authenticated user (used for inbox badge).
 */
@Injectable()
export class GetUnreadCountUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
  ) {}

  async execute(user: AccessTokenPayload): Promise<{ unreadCount: number }> {
    const unreadCount = await this.repo.countUnread(user.tenantId, user.sub);
    return { unreadCount };
  }
}
