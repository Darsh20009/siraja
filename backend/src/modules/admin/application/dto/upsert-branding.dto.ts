import { IsArray, IsBoolean, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertBrandingDto {
  @IsUrl() @IsOptional() logoUrl?: string;
  @IsUrl() @IsOptional() faviconUrl?: string;
  @IsObject() @IsOptional() colors?: Record<string, string>;
  @IsArray() @IsString({ each: true }) @IsOptional() supportedLanguages?: string[];
  @IsString() @IsOptional() defaultLanguage?: string;
  @IsObject() @IsOptional() features?: Record<string, boolean>;
  @IsObject() @IsOptional() limits?: Record<string, number>;
  @IsString() @IsOptional() customDomain?: string;
  @IsString() @IsOptional() tagline?: string;
  @IsString() @IsOptional() supportEmail?: string;
  @IsString() @IsOptional() supportPhone?: string;
  @IsObject() @IsOptional() socialLinks?: Record<string, string>;
}
