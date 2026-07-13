import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantType } from '@shared/enums/tenant-status.enum';

export class CreateTenantDto {
  @ApiProperty({ example: 'معهد البيان للقرآن' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'al-bayan', description: 'URL-safe slug: 3-50 lowercase letters/numbers/hyphens' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/, {
    message: 'slug must be 3-50 characters: lowercase letters, numbers, and hyphens only',
  })
  slug: string;

  @ApiProperty({ enum: TenantType })
  @IsEnum(TenantType)
  type: TenantType;

  @ApiPropertyOptional({ example: 'admin@al-bayan.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+966500000000' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Asia/Riyadh' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;

  @ApiPropertyOptional({ example: 'ar' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultLocale?: string;

  /** Full name of the initial tenant admin to create alongside the tenant. */
  @ApiPropertyOptional({ example: 'عبدالله المنصور' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  adminFullName?: string;

  /** Email for the initial tenant admin account. */
  @ApiPropertyOptional({ example: 'admin@al-bayan.com' })
  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  /** Temporary password for the initial tenant admin. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminPassword?: string;
}
