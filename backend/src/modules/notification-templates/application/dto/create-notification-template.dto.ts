import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NotificationChannel, NotificationType } from '@shared/enums/notification.enum';

export class CreateNotificationTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  description?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titleTemplate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  bodyTemplate: string;

  @IsString()
  @IsOptional()
  htmlBodyTemplate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];
}

export class UpdateNotificationTemplateDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  titleTemplate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  bodyTemplate?: string;

  @IsString()
  @IsOptional()
  htmlBodyTemplate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
