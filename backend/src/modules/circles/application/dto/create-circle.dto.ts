import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCircleDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  targetJuzStart?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  targetJuzEnd?: number;

  /**
   * Free-form schedule string, e.g. "Sun/Tue/Thu 4-6pm".
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  schedule?: string;
}
