import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { GetMeUseCase } from '../../application/use-cases/get-me.use-case';
import { UpdateMeUseCase } from '../../application/use-cases/update-me.use-case';
import { UpdateLanguagePreferencesUseCase } from '../../application/use-cases/update-language-preferences.use-case';
import { UpdateNotificationPreferencesUseCase } from '../../application/use-cases/update-notification-preferences.use-case';
import { UpdateProfileDto } from '../../application/dto/update-profile.dto';
import { UpdateLanguagePreferencesDto } from '../../application/dto/update-language-preferences.dto';
import { UpdateNotificationPreferencesDto } from '../../application/dto/update-notification-preferences.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly updateMe: UpdateMeUseCase,
    private readonly updateLanguage: UpdateLanguagePreferencesUseCase,
    private readonly updateNotifications: UpdateNotificationPreferencesUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: "Get the authenticated user's full profile and preferences" })
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.getMe.execute(user.tenantId, user.sub);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update profile fields (fullName, avatarUrl, gender)' })
  updateProfile(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateProfileDto) {
    return this.updateMe.execute(user.tenantId, user.sub, dto);
  }

  @Patch('me/language')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update language / locale preference' })
  updateLanguagePreferences(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateLanguagePreferencesDto,
  ) {
    return this.updateLanguage.execute(user.tenantId, user.sub, dto);
  }

  @Patch('me/notifications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification delivery preferences' })
  updateNotificationPreferences(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.updateNotifications.execute(user.tenantId, user.sub, dto);
  }
}
