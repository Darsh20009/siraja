import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ManualAwardAchievementDto {
  @IsMongoId()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  achievementType: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class ManualAwardBadgeDto {
  @IsMongoId()
  studentId: string;

  @IsMongoId()
  badgeDefinitionId: string;

  @IsString()
  @IsOptional()
  note?: string;
}
