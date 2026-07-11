import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EvaluationGrade } from '@shared/enums/memorization.enum';

export class ReviewRangeDto {
  @IsInt()
  @Min(1)
  @Max(114)
  surahFrom: number;

  @IsInt()
  @Min(1)
  ayahFrom: number;

  @IsInt()
  @Min(1)
  @Max(114)
  surahTo: number;

  @IsInt()
  @Min(1)
  ayahTo: number;
}

export class CreateReviewRecordDto {
  /** ObjectId of the Student profile being reviewed. */
  @IsString()
  @IsNotEmpty()
  studentId: string;

  /** Optional: the Session this review was conducted within. */
  @IsOptional()
  @IsString()
  sessionId?: string;

  /** Quran range covered in this revision session. */
  @ValidateNested()
  @Type(() => ReviewRangeDto)
  range: ReviewRangeDto;

  @IsOptional()
  @IsEnum(EvaluationGrade)
  retentionGrade?: EvaluationGrade;

  /** ISO-8601 datetime — when the next revision of this range is due. */
  @IsOptional()
  @IsISO8601()
  nextReviewDueAt?: string;

  @IsOptional()
  @IsISO8601()
  reviewedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
