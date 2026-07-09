import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: achievements
 *
 * A tenant-scoped record of a `Badge` (global catalog) awarded to a
 * specific student. Kept separate from `badges` because an award is a
 * per-tenant, per-student event with its own timestamp/context, while
 * `badges` is just the shared definition catalog.
 */
@Schema({ timestamps: true, collection: 'achievements' })
export class Achievement extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Badge', required: true })
  badge: Types.ObjectId;

  @Prop({ type: Date, required: true, default: () => new Date() })
  awardedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  awardedBy?: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  context?: string; // e.g. "Completed Juz 5 memorization"
}

export type AchievementDocument = HydratedDocument<Achievement>;
export const AchievementSchema = SchemaFactory.createForClass(Achievement);

AchievementSchema.index({ tenantId: 1, student: 1, badge: 1 }, { unique: true });
AchievementSchema.index({ tenantId: 1, awardedAt: -1 });
