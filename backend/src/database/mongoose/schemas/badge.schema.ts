import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';
import { AchievementCategory, BadgeTier } from '@shared/enums/gamification.enum';

/**
 * Collection: badges
 *
 * Platform-wide badge catalog (NOT tenant-scoped) — the definition of a
 * badge a student can earn. `achievements` records the actual per-student,
 * per-tenant award of a badge.
 */
@Schema({ timestamps: true, collection: 'badges' })
export class Badge extends BaseGlobalSchema {
  @Prop({ type: String, required: true, unique: true, trim: true, lowercase: true })
  code: string;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: String, enum: AchievementCategory, required: true })
  category: AchievementCategory;

  @Prop({ type: String, enum: BadgeTier, required: true, default: BadgeTier.BRONZE })
  tier: BadgeTier;

  @Prop({ type: String, required: false, trim: true })
  iconUrl?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export type BadgeDocument = HydratedDocument<Badge>;
export const BadgeSchema = SchemaFactory.createForClass(Badge);

// `code` is already uniquely indexed via `unique: true` on the @Prop above.
BadgeSchema.index({ category: 1, tier: 1 });
