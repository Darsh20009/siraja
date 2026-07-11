import { IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MemorizationStatus } from '@shared/enums/memorization.enum';

export class UpdateStudentDto {
  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  currentJuzNumber?: number;

  @IsOptional()
  @IsEnum(MemorizationStatus)
  currentMemorizationStatus?: MemorizationStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
