import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { AchievementType } from '@shared/enums/gamification.enum';

/**
 * Collection: achievement_definitions
 *
 * Defines what achievements exist and how they are earned.
 * The 9 predefined types are seeded per tenant on first activation.
 * Tenants can add custom achievements (custom type value).
 */
@Schema({ timestamps: true, collection: 'achievement_definitions' })
export class AchievementDefinition extends BaseSchema {
  @Prop({ type: String, required: true, trim: true })
  type: AchievementType | string; // AchievementType for predefined, custom string for extras

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: String, required: false })
  iconUrl?: string;

  /** Automatically awarded when threshold conditions are met. */
  @Prop({ type: Boolean, required: true, default: true })
  isAutomatic: boolean;

  /** Human-readable condition summary stored for display. */
  @Prop({ type: String, required: false })
  criteriaDescription?: string;

  @Prop({ type: Boolean, required: true, default: true })
  isActive: boolean;

  /** Bonus points awarded alongside the achievement badge. */
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  bonusPoints: number;

  /** Sort order in achievement lists. */
  @Prop({ type: Number, required: true, default: 0 })
  sortOrder: number;

  /** If true this achievement can be awarded multiple times to the same student. */
  @Prop({ type: Boolean, required: true, default: false })
  isRepeatable: boolean;

  /** Reference to user who created this definition (for custom ones). */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;
}

export type AchievementDefinitionDocument = HydratedDocument<AchievementDefinition>;
export const AchievementDefinitionSchema = SchemaFactory.createForClass(AchievementDefinition);

AchievementDefinitionSchema.index({ tenantId: 1, type: 1 }, { unique: true });
AchievementDefinitionSchema.index({ tenantId: 1, isActive: 1 });
