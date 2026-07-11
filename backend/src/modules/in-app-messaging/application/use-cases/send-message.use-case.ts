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
import { SendMessageDto } from '../dto/messaging.dto';

/**
 * SendMessageUseCase — post a message to an existing thread.
 * Only thread participants may send messages.
 */
@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(MESSAGE_THREAD_REPOSITORY)
    private readonly threadRepo: IMessageThreadRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepo: IMessageRepository,
  ) {}

  async execute(user: AccessTokenPayload, threadId: string, dto: SendMessageDto) {
    const thread = await this.threadRepo.findById(user.tenantId, threadId);
    if (!thread) throw new NotFoundException('Thread not found.');
    if (!thread.participants.includes(user.sub)) {
      throw new ForbiddenException('You are not a participant in this thread.');
    }
    if (thread.isArchived) throw new ForbiddenException('Cannot send to an archived thread.');

    const message = await this.messageRepo.create({
      tenantId: user.tenantId,
      threadId,
      senderId: user.sub,
      body: dto.body,
      refType: dto.refType,
      refId: dto.refId,
    });

    const preview = dto.body.slice(0, 100);
    await this.threadRepo.updateLastMessage(user.tenantId, threadId, preview);
    await this.threadRepo.incrementUnread(
      user.tenantId,
      threadId,
      thread.participants.filter((id) => id !== user.sub),
    );

    return message;
  }
}
