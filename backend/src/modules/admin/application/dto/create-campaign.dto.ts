import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCampaignDto {
  @IsString() name: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @Min(1) @Type(() => Number) targetAmount: number;
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() endDate?: string;
  @IsBoolean() @IsOptional() isPublic?: boolean;
  @IsString() @IsOptional() coverImageUrl?: string;
}
