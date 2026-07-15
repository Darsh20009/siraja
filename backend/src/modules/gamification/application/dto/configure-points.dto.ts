import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PointValuesDto {
  @IsNumber() @Min(0) @IsOptional() @Type(() => Number)
  memorization_completion?: number;

  @IsNumber() @Min(0) @IsOptional() @Type(() => Number)
  revision_completion?: number;

  @IsNumber() @Min(0) @IsOptional() @Type(() => Number)
  attendance?: number;

  @IsNumber() @Min(0) @IsOptional() @Type(() => Number)
  exam_success?: number;

  @IsNumber() @Min(0) @IsOptional() @Type(() => Number)
  daily_streak?: number;

  @IsNumber() @Min(0) @IsOptional() @Type(() => Number)
  weekly_streak?: number;

  @IsNumber() @Min(0) @IsOptional() @Type(() => Number)
  monthly_streak?: number;

  @IsNumber() @Min(0) @IsOptional() @Type(() => Number)
  ai_session?: number;

  @IsNumber() @Min(0) @IsOptional() @Type(() => Number)
  community_participation?: number;
}

export class ConfigurePointsDto {
  @IsOptional()
  @Type(() => PointValuesDto)
  pointValues?: PointValuesDto;

  @IsBoolean()
  @IsOptional()
  gamificationEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  leaderboardEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  achievementsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  badgesEnabled?: boolean;
}
