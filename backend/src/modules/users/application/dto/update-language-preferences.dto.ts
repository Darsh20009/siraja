import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const SUPPORTED_LOCALES = ['ar', 'en', 'fr', 'ur', 'id', 'tr', 'ms'];

export class UpdateLanguagePreferencesDto {
  @ApiPropertyOptional({
    description: 'BCP-47 locale code',
    example: 'ar',
    enum: SUPPORTED_LOCALES,
  })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LOCALES, { message: `locale must be one of: ${SUPPORTED_LOCALES.join(', ')}` })
  locale?: string;

  @ApiPropertyOptional({ example: 'Asia/Riyadh', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;
}
