import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSheikhDto {
  /**
   * userId of the User who will have the SHEIKH role.
   */
  @IsString()
  userId: string;

  /**
   * List of qualification labels, e.g. ["Ijazah - Hafs narration"].
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualifications?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}
