import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AssessmentType } from '@shared/enums/exam-assignment.enum';
import { EvaluationGrade } from '@shared/enums/memorization.enum';

export class CreateAssessmentDto {
  /** Student profile ObjectId being assessed. */
  @IsString()
  @IsNotEmpty()
  studentId: string;

  /** Circle/group ObjectId (optional). */
  @IsOptional()
  @IsString()
  groupId?: string;

  /** Period type: weekly / monthly / custom. */
  @IsEnum(AssessmentType)
  type: AssessmentType;

  /** ISO-8601 start of the assessment period. */
  @IsDateString()
  periodStart: string;

  /** ISO-8601 end of the assessment period. */
  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsEnum(EvaluationGrade)
  grade?: EvaluationGrade;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
