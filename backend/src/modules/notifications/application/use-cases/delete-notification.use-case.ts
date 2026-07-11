import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  NOTIFICATION_REPOSITORY,
  INotificationRepository,
} from '../../domain/repositories/notification.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * DeleteNotificationUseCase — hard-delete a notification document.
 * Ownership enforced: only the recipient (or an admin) may delete.
 */
@Injectable()
export class DeleteNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
  ) {}

  async execute(user: AccessTokenPayload, id: string): Promise<{ deleted: boolean }> {
    const notification = await this.repo.findById(user.tenantId, id);
    if (!notification) throw new NotFoundException('Notification not found.');

    const roles = user.roles as Role[];
    const isAdmin = roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPER_ADMIN);

    if (!isAdmin && notification.recipientId !== user.sub) {
      throw new ForbiddenException('Access denied.');
    }

    await this.repo.delete(user.tenantId, id);
    return { deleted: true };
  }
}
