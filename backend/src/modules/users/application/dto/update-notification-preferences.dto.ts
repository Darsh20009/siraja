import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, NotificationType } from '@shared/enums/notification.enum';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ enum: NotificationChannel, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  enabledChannels?: NotificationChannel[];

  @ApiPropertyOptional({ enum: NotificationType, isArray: true, description: 'Notification types to mute' })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  mutedTypes?: NotificationType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailDailyDigest?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 23, description: 'Hour (UTC) to send daily digest email' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  emailDigestHour?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inAppSoundEnabled?: boolean;
}
