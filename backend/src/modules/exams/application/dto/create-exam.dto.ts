import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExamCategory, ExamType } from '@shared/enums/exam-assignment.enum';

export class ExamRangeDto {
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

export class CreateExamDto {
  /** Student profile ObjectId being examined. */
  @IsString()
  @IsNotEmpty()
  studentId: string;

  /** Circle/group ObjectId (optional). */
  @IsOptional()
  @IsString()
  groupId?: string;

  /** User ObjectId of the examiner (defaults to the requesting user). */
  @IsOptional()
  @IsString()
  examinerId?: string;

  /** Content category: memorization / revision / completion. */
  @IsEnum(ExamCategory)
  category: ExamCategory;

  /** Format: oral / written / mixed. */
  @IsEnum(ExamType)
  type: ExamType;

  /** When the exam is scheduled (ISO-8601). */
  @IsDateString()
  scheduledAt: string;

  /** Quran range being examined (optional for written exams). */
  @IsOptional()
  @ValidateNested()
  @Type(() => ExamRangeDto)
  range?: ExamRangeDto;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
