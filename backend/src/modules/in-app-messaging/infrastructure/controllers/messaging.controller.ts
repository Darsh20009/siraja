import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { CreateThreadUseCase } from '../../application/use-cases/create-thread.use-case';
import { SendMessageUseCase } from '../../application/use-cases/send-message.use-case';
import { ListThreadsUseCase } from '../../application/use-cases/list-threads.use-case';
import { ListMessagesUseCase } from '../../application/use-cases/list-messages.use-case';
import { CreateThreadDto, SendMessageDto } from '../../application/dto/messaging.dto';
import { ThreadType } from '@shared/enums/messaging.enum';
import { Role } from '@shared/enums/roles.enum';
import {
  MESSAGE_THREAD_REPOSITORY,
  IMessageThreadRepository,
} from '../../domain/repositories/message-thread.repository.interface';

/**
 * Messaging API — `/messaging`
 *
 * RBAC summary:
 *  POST   /messaging/threads                → MESSAGING.CREATE
 *  GET    /messaging/threads                → MESSAGING.READ  (participant-scoped)
 *  GET    /messaging/threads/:id            → MESSAGING.READ  (participant or admin only)
 *  POST   /messaging/threads/:id/messages   → MESSAGING.CREATE (participant only)
 *  GET    /messaging/threads/:id/messages   → MESSAGING.READ  (participant or admin only)
 *  PATCH  /messaging/threads/:id/archive    → MESSAGING.DELETE (creator or admin only)
 *
 * Object-level authorization (IDOR protection):
 *  - getThread: verifies caller is a participant or admin before returning.
 *  - archive:   verifies caller is the thread creator or admin before archiving.
 *  - send/messages: use-cases already enforce participant membership.
 */
@Controller('messaging')
export class MessagingController {
  constructor(
    private readonly createThread: CreateThreadUseCase,
    private readonly sendMessage: SendMessageUseCase,
    private readonly listThreads: ListThreadsUseCase,
    private readonly listMessages: ListMessagesUseCase,
    @Inject(MESSAGE_THREAD_REPOSITORY)
    private readonly threadRepo: IMessageThreadRepository,
  ) {}

  @Post('threads')
  @RequirePermissions(PERMISSIONS.MESSAGING.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateThreadDto) {
    return this.createThread.execute(user, dto);
  }

  @Get('threads')
  @RequirePermissions(PERMISSIONS.MESSAGING.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('type') type?: ThreadType,
    @Query('circleId') circleId?: string,
    @Query('isArchived') isArchived?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listThreads.execute(user, {
      type,
      circleId,
      isArchived: isArchived === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
    });
  }

  /**
   * GET /messaging/threads/:id
   *
   * Object-level authorization: non-admin callers must be participants.
   */
  @Get('threads/:id')
  @RequirePermissions(PERMISSIONS.MESSAGING.READ!)
  async getThread(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    const thread = await this.threadRepo.findById(user.tenantId, id);
    if (!thread) throw new NotFoundException('Thread not found.');

    const isAdmin = this.isAdmin(user.roles as Role[]);
    if (!isAdmin && !thread.participants.includes(user.sub)) {
      throw new ForbiddenException('You are not a participant in this thread.');
    }

    return thread;
  }

  @Post('threads/:id/messages')
  @RequirePermissions(PERMISSIONS.MESSAGING.CREATE!)
  send(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') threadId: string,
    @Body() dto: SendMessageDto,
  ) {
    // SendMessageUseCase already enforces participant membership.
    return this.sendMessage.execute(user, threadId, dto);
  }

  @Get('threads/:id/messages')
  @RequirePermissions(PERMISSIONS.MESSAGING.READ!)
  messages(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') threadId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // ListMessagesUseCase already enforces participant/admin check.
    return this.listMessages.execute(user, threadId, page ? Number(page) : 1, limit ? Number(limit) : 50);
  }

  /**
   * PATCH /messaging/threads/:id/archive
   *
   * Object-level authorization: only the thread creator or an admin may archive.
   * Participants who did not create the thread cannot archive it.
   */
  @Patch('threads/:id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.MESSAGING.DELETE!)
  async archive(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    const thread = await this.threadRepo.findById(user.tenantId, id);
    if (!thread) throw new NotFoundException('Thread not found.');

    const isAdmin = this.isAdmin(user.roles as Role[]);
    if (!isAdmin && thread.createdById !== user.sub) {
      throw new ForbiddenException('Only the thread creator or an admin can archive a thread.');
    }

    return this.threadRepo.archive(user.tenantId, id);
  }

  private isAdmin(roles: Role[]): boolean {
    return roles.includes(Role.TENANT_ADMIN) || roles.includes(Role.SUPER_ADMIN);
  }
}
