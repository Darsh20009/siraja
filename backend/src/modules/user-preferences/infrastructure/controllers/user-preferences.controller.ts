import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import {
  UpdateAnnouncementPreferencesDto,
  UpdateEmailPreferencesDto,
  UpdateNotificationPreferencesDto,
} from '../../application/dto/user-preferences.dto';
import { Inject } from '@nestjs/common';
import {
  USER_PREFERENCES_REPOSITORY,
  IUserPreferencesRepository,
} from '../../domain/repositories/user-preferences.repository.interface';

/**
 * User Preferences API — `/user-preferences`
 *
 * All routes are self-service: every authenticated user manages their own
 * preferences only. There is no admin endpoint to modify another user's
 * preferences — ownership is always the caller's userId.
 *
 * RBAC summary:
 *  GET    /user-preferences                  → USER_PREFERENCES.READ
 *  PATCH  /user-preferences/notifications    → USER_PREFERENCES.UPDATE
 *  PATCH  /user-preferences/email            → USER_PREFERENCES.UPDATE
 *  PATCH  /user-preferences/announcements    → USER_PREFERENCES.UPDATE
 */
@Controller('user-preferences')
export class UserPreferencesController {
  constructor(
    @Inject(USER_PREFERENCES_REPOSITORY)
    private readonly repo: IUserPreferencesRepository,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USER_PREFERENCES.READ!)
  get(@CurrentUser() user: AccessTokenPayload) {
    return this.repo.getOrCreate(user.tenantId, user.sub);
  }

  @Patch('notifications')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.USER_PREFERENCES.UPDATE!)
  updateNotifications(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.repo.updateNotifications(user.tenantId, user.sub, {
      enabledChannels: dto.enabledChannels,
      mutedTypes: dto.mutedTypes,
      inApp: {
        enabled: dto.inAppEnabled,
        soundEnabled: dto.soundEnabled,
      },
    });
  }

  @Patch('email')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.USER_PREFERENCES.UPDATE!)
  updateEmail(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateEmailPreferencesDto,
  ) {
    return this.repo.updateEmail(user.tenantId, user.sub, dto);
  }

  @Patch('announcements')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.USER_PREFERENCES.UPDATE!)
  updateAnnouncements(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateAnnouncementPreferencesDto,
  ) {
    return this.repo.updateAnnouncements(user.tenantId, user.sub, dto);
  }
}
