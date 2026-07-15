import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: student_achievements
 *
 * Records that a student has earned a specific achievement.
 * Multiple documents per student (one per earned achievement + per repeat).
 */
@Schema({ timestamps: true, collection: 'student_achievements' })
export class StudentAchievement extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AchievementDefinition', required: true })
  achievementId: Types.ObjectId;

  /** ISO date string when the achievement was earned. */
  @Prop({ type: String, required: true })
  awardedAt: string;

  /** 'automatic' = triggered by engine; 'manual' = sheikh/admin action. */
  @Prop({ type: String, enum: ['automatic', 'manual'], required: true, default: 'automatic' })
  awardedBy: 'automatic' | 'manual';

  /** Populated when awardedBy = 'manual'. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  awardedByUserId?: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  note?: string;
}

export type StudentAchievementDocument = HydratedDocument<StudentAchievement>;
export const StudentAchievementSchema = SchemaFactory.createForClass(StudentAchievement);

StudentAchievementSchema.index({ tenantId: 1, studentId: 1, achievementId: 1 });
StudentAchievementSchema.index({ tenantId: 1, achievementId: 1 });
StudentAchievementSchema.index({ tenantId: 1, studentId: 1, awardedAt: -1 });
