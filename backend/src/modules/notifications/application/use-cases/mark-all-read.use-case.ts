import { Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  NOTIFICATION_REPOSITORY,
  INotificationRepository,
} from '../../domain/repositories/notification.repository.interface';

/**
 * MarkAllReadUseCase — mark all of the authenticated user's unread notifications as read.
 */
@Injectable()
export class MarkAllReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
  ) {}

  async execute(user: AccessTokenPayload): Promise<{ updated: number }> {
    const updated = await this.repo.markAllRead(user.tenantId, user.sub);
    return { updated };
  }
}
