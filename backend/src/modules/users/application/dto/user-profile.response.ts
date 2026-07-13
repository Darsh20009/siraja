import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, NotificationType } from '@shared/enums/notification.enum';

export class NotificationPreferencesDto {
  @ApiProperty({ enum: NotificationChannel, isArray: true })
  enabledChannels: NotificationChannel[];

  @ApiProperty({ enum: NotificationType, isArray: true })
  mutedTypes: NotificationType[];

  @ApiProperty()
  emailEnabled: boolean;

  @ApiProperty()
  emailDailyDigest: boolean;

  @ApiProperty()
  emailDigestHour: number;

  @ApiProperty()
  inAppEnabled: boolean;

  @ApiProperty()
  inAppSoundEnabled: boolean;
}

export class UserProfileResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty()
  fullName: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  gender?: string;

  @ApiProperty({ isArray: true })
  roles: string[];

  @ApiProperty()
  status: string;

  @ApiProperty()
  isEmailVerified: boolean;

  @ApiProperty()
  isPhoneVerified: boolean;

  @ApiProperty()
  preferredLocale: string;

  @ApiPropertyOptional()
  lastLoginAt?: Date;

  @ApiProperty()
  isMfaEnabled: boolean;

  @ApiPropertyOptional({ type: () => NotificationPreferencesDto })
  notificationPreferences?: NotificationPreferencesDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
