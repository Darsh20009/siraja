import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  MESSAGE_THREAD_REPOSITORY,
  IMessageThreadRepository,
} from '../../domain/repositories/message-thread.repository.interface';
import {
  MESSAGE_REPOSITORY,
  IMessageRepository,
} from '../../domain/repositories/message.repository.interface';
import { CreateThreadDto } from '../dto/messaging.dto';
import { Role } from '@shared/enums/roles.enum';
import { ThreadType } from '@shared/enums/messaging.enum';

/**
 * CreateThreadUseCase
 *
 * Creates a new messaging thread. Thread type determines who can initiate:
 *   SHEIKH_STUDENT / SHEIKH_PARENT     → Sheikh, Tenant Admin
 *   ADMIN_USER                         → Tenant Admin, Super Admin
 *   SUPERVISOR_CIRCLE                  → Supervisor, Tenant Admin
 *
 * RBAC guard (MESSAGING.CREATE) already limits the set of callers; this
 * use-case applies the finer-grained type-based restriction.
 */
@Injectable()
export class CreateThreadUseCase {
  constructor(
    @Inject(MESSAGE_THREAD_REPOSITORY)
    private readonly threadRepo: IMessageThreadRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepo: IMessageRepository,
  ) {}

  async execute(user: AccessTokenPayload, dto: CreateThreadDto) {
    const roles = user.roles as Role[];
    const isAdmin = roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPER_ADMIN);
    const isSheikh = roles.includes(Role.SHEIKH);
    const isSupervisor = roles.includes(Role.SUPERVISOR);

    this.assertAllowed(dto.type, { isAdmin, isSheikh, isSupervisor });

    const participants = Array.from(new Set([user.sub, ...dto.participants]));

    const thread = await this.threadRepo.create({
      tenantId: user.tenantId,
      type: dto.type,
      createdById: user.sub,
      participants,
      circleId: dto.circleId,
      subject: dto.subject,
    });

    if (dto.initialMessage) {
      const message = await this.messageRepo.create({
        tenantId: user.tenantId,
        threadId: thread.id,
        senderId: user.sub,
        body: dto.initialMessage,
      });
      await this.threadRepo.updateLastMessage(user.tenantId, thread.id, message.body.slice(0, 100));
      await this.threadRepo.incrementUnread(
        user.tenantId,
        thread.id,
        participants.filter((id) => id !== user.sub),
      );
    }

    return thread;
  }

  private assertAllowed(
    type: ThreadType,
    ctx: { isAdmin: boolean; isSheikh: boolean; isSupervisor: boolean },
  ) {
    switch (type) {
      case ThreadType.SHEIKH_STUDENT:
      case ThreadType.SHEIKH_PARENT:
        if (!ctx.isSheikh && !ctx.isAdmin)
          throw new ForbiddenException('Only Sheikhs or Admins may initiate this thread type.');
        break;
      case ThreadType.ADMIN_USER:
        if (!ctx.isAdmin)
          throw new ForbiddenException('Only Admins may initiate Admin→User threads.');
        break;
      case ThreadType.SUPERVISOR_CIRCLE:
        if (!ctx.isSupervisor && !ctx.isAdmin)
          throw new ForbiddenException('Only Supervisors or Admins may initiate Supervisor→Circle threads.');
        break;
    }
  }
}
