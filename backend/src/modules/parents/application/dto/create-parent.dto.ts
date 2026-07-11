import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateParentDto {
  /**
   * userId of the User who will have the PARENT role.
   */
  @IsString()
  userId: string;

  /**
   * Relationship label, e.g. "father", "mother", "guardian".
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  relationship?: string;
}
