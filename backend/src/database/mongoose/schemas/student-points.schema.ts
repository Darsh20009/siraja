import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { PointActivityType } from '@shared/enums/gamification.enum';

/**
 * Collection: student_points
 *
 * Materialised running totals per student — updated on every point award.
 * One document per student. Read from this document for UI display;
 * only PointTransactions are the authoritative source of truth.
 */
@Schema({ timestamps: true, collection: 'student_points' })
export class StudentPoints extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  totalPoints: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  dailyPoints: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  weeklyPoints: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  monthlyPoints: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  yearlyPoints: number;

  /** Per-activity breakdown for detailed stats display. */
  @Prop({ type: Object, required: true, default: () => ({}) })
  breakdown: Partial<Record<PointActivityType, number>>;

  /** Last period reset timestamps — used to roll over daily/weekly/monthly counters. */
  @Prop({ type: String, required: false })
  lastDailyReset?: string;   // YYYY-MM-DD

  @Prop({ type: String, required: false })
  lastWeeklyReset?: string;  // YYYY-WNN

  @Prop({ type: String, required: false })
  lastMonthlyReset?: string; // YYYY-MM

  @Prop({ type: String, required: false })
  lastYearlyReset?: string;  // YYYY
}

export type StudentPointsDocument = HydratedDocument<StudentPoints>;
export const StudentPointsSchema = SchemaFactory.createForClass(StudentPoints);

StudentPointsSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });
StudentPointsSchema.index({ tenantId: 1, totalPoints: -1 });
StudentPointsSchema.index({ tenantId: 1, weeklyPoints: -1 });
StudentPointsSchema.index({ tenantId: 1, monthlyPoints: -1 });
