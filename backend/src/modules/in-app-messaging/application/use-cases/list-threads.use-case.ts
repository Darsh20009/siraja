import { Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  MESSAGE_THREAD_REPOSITORY,
  IMessageThreadRepository,
} from '../../domain/repositories/message-thread.repository.interface';
import { Role } from '@shared/enums/roles.enum';
import { ThreadType } from '@shared/enums/messaging.enum';

/**
 * ListThreadsUseCase — returns threads the caller participates in.
 * Tenant Admin / Super Admin can view all threads in the tenant.
 */
@Injectable()
export class ListThreadsUseCase {
  constructor(
    @Inject(MESSAGE_THREAD_REPOSITORY)
    private readonly threadRepo: IMessageThreadRepository,
  ) {}

  async execute(
    user: AccessTokenPayload,
    opts: {
      type?: ThreadType;
      circleId?: string;
      isArchived?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const roles = user.roles as Role[];
    const isAdmin = roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPER_ADMIN);

    return this.threadRepo.findAll(
      user.tenantId,
      {
        participantId: isAdmin ? undefined : user.sub,
        type: opts.type,
        circleId: opts.circleId,
        isArchived: opts.isArchived ?? false,
      },
      opts.page ?? 1,
      opts.limit ?? 20,
    );
  }
}
