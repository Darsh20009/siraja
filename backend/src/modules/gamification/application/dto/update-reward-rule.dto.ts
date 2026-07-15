import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRewardRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  conditionValue?: number;

  @IsString()
  @IsOptional()
  actionValue?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  oncePerStudent?: boolean;
}
