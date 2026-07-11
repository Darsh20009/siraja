import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AssessmentStatus } from '@shared/enums/exam-assignment.enum';
import { EvaluationGrade } from '@shared/enums/memorization.enum';

export class UpdateAssessmentDto {
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

  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;
}
