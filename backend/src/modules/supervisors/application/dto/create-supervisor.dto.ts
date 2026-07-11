import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupervisorDto {
  /**
   * userId of the User who will have the SUPERVISOR role.
   */
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string;
}
