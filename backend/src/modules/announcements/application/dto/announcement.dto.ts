import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AnnouncementScope } from '@shared/enums/announcement.enum';
import { NotificationPriority } from '@shared/enums/notification.enum';

export class CreateAnnouncementDto {
  @IsEnum(AnnouncementScope)
  scope: AnnouncementScope;

  @IsString()
  @IsOptional()
  circleId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;

  @IsString()
  @IsOptional()
  htmlBody?: string;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  deepLink?: string;
}

export class UpdateAnnouncementDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  body?: string;

  @IsString()
  @IsOptional()
  htmlBody?: string;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  deepLink?: string;
}
