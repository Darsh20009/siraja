import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { EvaluationGrade } from '@shared/enums/memorization.enum';

export class ApproveMemorizationRecordDto {
  @IsEnum(EvaluationGrade)
  grade: EvaluationGrade;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
