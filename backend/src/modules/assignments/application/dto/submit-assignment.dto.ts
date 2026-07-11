import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitAssignmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  submissionNotes?: string;
}
