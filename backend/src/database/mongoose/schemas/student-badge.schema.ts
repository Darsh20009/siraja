import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: student_badges
 *
 * Records that a student has earned a specific badge.
 * Multiple documents per student (one per badge + per repeat for seasonal/event).
 */
@Schema({ timestamps: true, collection: 'student_badges' })
export class StudentBadge extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BadgeDefinition', required: true })
  badgeId: Types.ObjectId;

  @Prop({ type: String, required: true })
  awardedAt: string; // ISO date string

  @Prop({ type: String, enum: ['automatic', 'manual', 'rule'], required: true, default: 'manual' })
  awardedBy: 'automatic' | 'manual' | 'rule';

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  awardedByUserId?: Types.ObjectId;

  /** ID of the reward rule that triggered this award, if awardedBy='rule'. */
  @Prop({ type: Types.ObjectId, ref: 'RewardRule', required: false })
  triggeredByRuleId?: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  note?: string;
}

export type StudentBadgeDocument = HydratedDocument<StudentBadge>;
export const StudentBadgeSchema = SchemaFactory.createForClass(StudentBadge);

StudentBadgeSchema.index({ tenantId: 1, studentId: 1, badgeId: 1 });
StudentBadgeSchema.index({ tenantId: 1, badgeId: 1 });
StudentBadgeSchema.index({ tenantId: 1, studentId: 1, awardedAt: -1 });
