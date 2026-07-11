import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AssignStudentCircleDto {
  /** Student profile id. */
  @IsString()
  studentId: string;

  /** Target circle id. */
  @IsString()
  circleId: string;

  /**
   * Optional note recorded in the enrollment history.
   * e.g. "Moved to smaller group for extra attention."
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
