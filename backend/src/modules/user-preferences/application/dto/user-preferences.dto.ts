import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { NotificationChannel, NotificationType } from '@shared/enums/notification.enum';

export class UpdateNotificationPreferencesDto {
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  enabledChannels?: NotificationChannel[];

  @IsArray()
  @IsEnum(NotificationType, { each: true })
  @IsOptional()
  mutedTypes?: NotificationType[];

  @IsBoolean()
  @IsOptional()
  inAppEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  soundEnabled?: boolean;
}

export class UpdateEmailPreferencesDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  dailyDigest?: boolean;

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  digestHour?: number;
}

export class UpdateAnnouncementPreferencesDto {
  @IsBoolean()
  @IsOptional()
  receiveGlobal?: boolean;

  @IsBoolean()
  @IsOptional()
  receiveTenant?: boolean;

  @IsBoolean()
  @IsOptional()
  receiveCircle?: boolean;
}
