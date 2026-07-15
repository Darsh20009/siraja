import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { BadgeTier, BadgeType } from '@shared/enums/gamification.enum';

export class CreateBadgeDefinitionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(BadgeTier)
  tier: BadgeTier;

  @IsEnum(BadgeType)
  @IsOptional()
  type?: BadgeType;

  @IsUrl()
  @IsOptional()
  iconUrl?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  bonusPoints?: number;

  @IsString()
  @IsOptional()
  seasonKey?: string;

  @IsString()
  @IsOptional()
  eventKey?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
