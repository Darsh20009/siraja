import { IsDateString, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStudentDto {
  /**
   * userId of the User who will have the STUDENT role.
   * The caller is responsible for ensuring the user exists in the tenant.
   */
  @IsString()
  userId: string;

  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
