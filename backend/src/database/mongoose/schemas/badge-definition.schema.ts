import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { BadgeTier, BadgeType } from '@shared/enums/gamification.enum';

/**
 * Collection: badge_definitions
 *
 * Defines available badges per tenant. Supports automatic, manual,
 * seasonal, and event-based award types.
 */
@Schema({ timestamps: true, collection: 'badge_definitions' })
export class BadgeDefinition extends BaseSchema {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: String, enum: BadgeTier, required: true })
  tier: BadgeTier;

  @Prop({ type: String, enum: BadgeType, required: true, default: BadgeType.MANUAL })
  type: BadgeType;

  @Prop({ type: String, required: false })
  iconUrl?: string;

  @Prop({ type: Boolean, required: true, default: true })
  isActive: boolean;

  /** For SEASONAL badges — season identifier (e.g. "ramadan-2026"). */
  @Prop({ type: String, required: false, trim: true })
  seasonKey?: string;

  /** For EVENT_BASED badges — event identifier. */
  @Prop({ type: String, required: false, trim: true })
  eventKey?: string;

  /** Bonus points awarded alongside the badge. */
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  bonusPoints: number;

  @Prop({ type: Number, required: true, default: 0 })
  sortOrder: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;
}

export type BadgeDefinitionDocument = HydratedDocument<BadgeDefinition>;
export const BadgeDefinitionSchema = SchemaFactory.createForClass(BadgeDefinition);

BadgeDefinitionSchema.index({ tenantId: 1, tier: 1 });
BadgeDefinitionSchema.index({ tenantId: 1, type: 1 });
BadgeDefinitionSchema.index({ tenantId: 1, isActive: 1 });
