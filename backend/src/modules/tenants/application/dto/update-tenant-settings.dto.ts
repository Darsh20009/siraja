import { IsBoolean, IsHexColor, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional({ example: '#1A6B4A', description: 'Primary brand color (hex)' })
  @IsOptional()
  @IsHexColor()
  brandPrimaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  attendanceNotificationsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  parentPortalEnabled?: boolean;

  @ApiPropertyOptional({ example: 'ar' })
  @IsOptional()
  @IsString()
  primaryLocale?: string;
}
