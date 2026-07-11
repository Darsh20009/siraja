import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateCircleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(500)
  schedule?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
