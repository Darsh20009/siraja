import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  MESSAGE_THREAD_REPOSITORY,
  IMessageThreadRepository,
} from '../../domain/repositories/message-thread.repository.interface';
import {
  MESSAGE_REPOSITORY,
  IMessageRepository,
} from '../../domain/repositories/message.repository.interface';
import { Role } from '@shared/enums/roles.enum';

/**
 * ListMessagesUseCase — returns messages for a thread, paginated oldest-first.
 * Marks all messages in the thread as read for the caller.
 */
@Injectable()
export class ListMessagesUseCase {
  constructor(
    @Inject(MESSAGE_THREAD_REPOSITORY)
    private readonly threadRepo: IMessageThreadRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepo: IMessageRepository,
  ) {}

  async execute(
    user: AccessTokenPayload,
    threadId: string,
    page = 1,
    limit = 50,
  ) {
    const thread = await this.threadRepo.findById(user.tenantId, threadId);
    if (!thread) throw new NotFoundException('Thread not found.');

    const roles = user.roles as Role[];
    const isAdmin = roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPER_ADMIN);

    if (!isAdmin && !thread.participants.includes(user.sub)) {
      throw new ForbiddenException('Access denied.');
    }

    const result = await this.messageRepo.findByThread(user.tenantId, threadId, page, limit);

    // Auto mark-read: fire-and-forget.
    void this.messageRepo.markReadForUser(user.tenantId, threadId, user.sub).then(() =>
      this.threadRepo.clearUnread(user.tenantId, threadId, user.sub),
    );

    return result;
  }
}
