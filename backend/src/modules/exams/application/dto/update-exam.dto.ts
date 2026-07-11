import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ExamStatus } from '@shared/enums/exam-assignment.enum';

export class UpdateExamDto {
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;

  @IsOptional()
  @IsString()
  examinerId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
