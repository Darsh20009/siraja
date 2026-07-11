import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSupervisorDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
