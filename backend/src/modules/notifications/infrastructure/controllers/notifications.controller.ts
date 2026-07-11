import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { CreateNotificationUseCase } from '../../application/use-cases/create-notification.use-case';
import { ListNotificationsUseCase } from '../../application/use-cases/list-notifications.use-case';
import { GetNotificationUseCase } from '../../application/use-cases/get-notification.use-case';
import { MarkReadUseCase } from '../../application/use-cases/mark-read.use-case';
import { MarkAllReadUseCase } from '../../application/use-cases/mark-all-read.use-case';
import { ArchiveNotificationUseCase } from '../../application/use-cases/archive-notification.use-case';
import { DeleteNotificationUseCase } from '../../application/use-cases/delete-notification.use-case';
import { GetUnreadCountUseCase } from '../../application/use-cases/get-unread-count.use-case';
import { CreateNotificationDto } from '../../application/dto/create-notification.dto';
import { ListNotificationsDto } from '../../application/dto/list-notifications.dto';

/**
 * Notifications API — `/notifications`
 *
 * RBAC summary:
 *  POST   /notifications               → NOTIFICATIONS.CREATE (Sheikh, Supervisor, Admin)
 *  GET    /notifications               → NOTIFICATIONS.READ   (own inbox)
 *  GET    /notifications/unread-count  → NOTIFICATIONS.READ
 *  GET    /notifications/:id           → NOTIFICATIONS.READ
 *  PATCH  /notifications/:id/read      → NOTIFICATIONS.READ   (mark read)
 *  PATCH  /notifications/read-all      → NOTIFICATIONS.READ   (mark all read)
 *  PATCH  /notifications/:id/archive   → NOTIFICATIONS.READ   (archive)
 *  DELETE /notifications/:id           → NOTIFICATIONS.DELETE
 */
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly createNotification: CreateNotificationUseCase,
    private readonly listNotifications: ListNotificationsUseCase,
    private readonly getNotification: GetNotificationUseCase,
    private readonly markRead: MarkReadUseCase,
    private readonly markAllRead: MarkAllReadUseCase,
    private readonly archiveNotification: ArchiveNotificationUseCase,
    private readonly deleteNotification: DeleteNotificationUseCase,
    private readonly getUnreadCount: GetUnreadCountUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.CREATE!)
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateNotificationDto) {
    return this.createNotification.execute(user, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.READ!)
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() dto: ListNotificationsDto,
    @Query('recipientId') recipientId?: string,
  ) {
    return this.listNotifications.execute(user, dto, recipientId);
  }

  @Get('unread-count')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.READ!)
  unreadCount(@CurrentUser() user: AccessTokenPayload) {
    return this.getUnreadCount.execute(user);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.READ!)
  readAll(@CurrentUser() user: AccessTokenPayload) {
    return this.markAllRead.execute(user);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.READ!)
  getOne(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.getNotification.execute(user, id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.READ!)
  read(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.markRead.execute(user, id);
  }

  @Patch(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.READ!)
  archive(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.archiveNotification.execute(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS.DELETE!)
  delete(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.deleteNotification.execute(user, id);
  }
}
