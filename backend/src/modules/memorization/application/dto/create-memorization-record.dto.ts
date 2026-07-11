import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuranRangeDto {
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

export class CreateMemorizationRecordDto {
  /** ObjectId of the Student profile being evaluated. */
  @IsString()
  @IsNotEmpty()
  studentId: string;

  /** Optional: the Session this evaluation was conducted within. */
  @IsOptional()
  @IsString()
  sessionId?: string;

  /** Quran range covered in this memorization session. */
  @ValidateNested()
  @Type(() => QuranRangeDto)
  range: QuranRangeDto;

  @IsOptional()
  @IsISO8601()
  evaluatedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
