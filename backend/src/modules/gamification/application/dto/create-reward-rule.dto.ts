import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RewardRuleActionType, RewardRuleConditionType } from '@shared/enums/gamification.enum';

export class CreateRewardRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RewardRuleConditionType)
  conditionType: RewardRuleConditionType;

  @IsNumber()
  @Min(0)
  conditionValue: number;

  @IsEnum(RewardRuleActionType)
  actionType: RewardRuleActionType;

  @IsString()
  @IsNotEmpty()
  actionValue: string;

  @IsBoolean()
  @IsOptional()
  oncePerStudent?: boolean;
}
