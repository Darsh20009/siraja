import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AyahPerformanceStatus } from '@shared/enums/smart-mushaf.enum';

/** Manual sheikh/admin override of a single ayah's tracked performance. */
export class UpdateAyahPerformanceDto {
  @IsOptional()
  @IsEnum(AyahPerformanceStatus)
  status?: AyahPerformanceStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  confidenceScore?: number;
}
