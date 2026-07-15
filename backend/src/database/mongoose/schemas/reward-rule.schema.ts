import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { RewardRuleActionType, RewardRuleConditionType } from '@shared/enums/gamification.enum';

/**
 * Collection: reward_rules
 *
 * Tenant-configurable IF/THEN rules:
 *   IF <conditionType> <operator> <conditionValue>
 *   THEN <actionType> <actionValue>
 *
 * The RewardRulesEngineService evaluates all active rules after every
 * point-awarding event and applies any that have newly been satisfied.
 */
@Schema({ timestamps: true, collection: 'reward_rules' })
export class RewardRule extends BaseSchema {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: String, enum: RewardRuleConditionType, required: true })
  conditionType: RewardRuleConditionType;

  /** Numeric threshold for the condition (e.g. 30 for "attendance > 30 days"). */
  @Prop({ type: Number, required: true, min: 0 })
  conditionValue: number;

  @Prop({ type: String, enum: RewardRuleActionType, required: true })
  actionType: RewardRuleActionType;

  /**
   * Meaning depends on actionType:
   * - AWARD_BADGE → BadgeDefinition ObjectId string
   * - AWARD_ACHIEVEMENT → AchievementDefinition ObjectId string
   * - AWARD_POINTS → point amount (numeric string)
   */
  @Prop({ type: String, required: true })
  actionValue: string;

  @Prop({ type: Boolean, required: true, default: true })
  isActive: boolean;

  /** If true the rule fires only once per student (idempotent). */
  @Prop({ type: Boolean, required: true, default: true })
  oncePerStudent: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;
}

export type RewardRuleDocument = HydratedDocument<RewardRule>;
export const RewardRuleSchema = SchemaFactory.createForClass(RewardRule);

RewardRuleSchema.index({ tenantId: 1, isActive: 1 });
RewardRuleSchema.index({ tenantId: 1, conditionType: 1 });
