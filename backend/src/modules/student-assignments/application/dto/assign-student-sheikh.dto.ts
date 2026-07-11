import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AssignStudentSheikhDto {
  /** Student profile id. */
  @IsString()
  studentId: string;

  /** Sheikh profile id for the 1-on-1 private assignment. */
  @IsString()
  sheikhId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
