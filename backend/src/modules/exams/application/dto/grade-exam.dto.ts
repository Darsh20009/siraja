import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ExamResult } from '@shared/enums/exam-assignment.enum';
import { EvaluationGrade } from '@shared/enums/memorization.enum';

export class GradeExamDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsOptional()
  @IsEnum(EvaluationGrade)
  grade?: EvaluationGrade;

  @IsEnum(ExamResult)
  result: ExamResult;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
