import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MistakeSeverity, MistakeType } from '@shared/enums/memorization.enum';

export class LogMistakeDto {
  /** Student profile ObjectId. */
  @IsString()
  @IsNotEmpty()
  studentId: string;

  /** Link to the parent MemorizationRecord (set this OR reviewRecordId). */
  @IsOptional()
  @IsString()
  memorizationRecordId?: string;

  /** Link to the parent ReviewRecord (set this OR memorizationRecordId). */
  @IsOptional()
  @IsString()
  reviewRecordId?: string;

  @IsInt()
  @Min(1)
  @Max(114)
  surahNumber: number;

  @IsInt()
  @Min(1)
  ayahNumber: number;

  @IsEnum(MistakeType)
  type: MistakeType;

  @IsEnum(MistakeSeverity)
  severity: MistakeSeverity;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
