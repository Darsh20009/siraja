import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantSettingsResponse {
  @ApiProperty()
  primaryLocale: string;

  @ApiProperty({ isArray: true })
  supportedLocales: string[];

  @ApiPropertyOptional()
  brandPrimaryColor?: string;

  @ApiProperty()
  attendanceNotificationsEnabled: boolean;

  @ApiProperty()
  parentPortalEnabled: boolean;
}

export class TenantResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  contactEmail?: string;

  @ApiPropertyOptional()
  contactPhone?: string;

  @ApiPropertyOptional()
  timezone?: string;

  @ApiPropertyOptional()
  defaultLocale?: string;

  @ApiPropertyOptional()
  trialEndsAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
