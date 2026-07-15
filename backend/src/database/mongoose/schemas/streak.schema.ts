import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: streaks
 *
 * Tracks daily / weekly / monthly engagement streaks per student.
 * One document per student. Updated atomically on each qualifying activity.
 */
@Schema({ timestamps: true, collection: 'streaks' })
export class Streak extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;

  // ── Daily streak ──────────────────────────────────────────────────────────
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  currentDailyStreak: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  longestDailyStreak: number;

  /** YYYY-MM-DD of last day that counted toward the daily streak. */
  @Prop({ type: String, required: false })
  lastDailyActivityDate?: string;

  // ── Weekly streak ─────────────────────────────────────────────────────────
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  currentWeeklyStreak: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  longestWeeklyStreak: number;

  /** ISO week string of last week that counted (e.g. "2026-W28"). */
  @Prop({ type: String, required: false })
  lastWeeklyActivityWeek?: string;

  // ── Monthly streak ────────────────────────────────────────────────────────
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  currentMonthlyStreak: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  longestMonthlyStreak: number;

  /** Month string of last month that counted (e.g. "2026-07"). */
  @Prop({ type: String, required: false })
  lastMonthlyActivityMonth?: string;

  /** Set of YYYY-MM-DD dates the student was active this year — used for
   *  perfect-attendance achievement checks. Kept as array for Mongo querying. */
  @Prop({ type: [String], required: true, default: [] })
  activeDatesThisYear: string[];
}

export type StreakDocument = HydratedDocument<Streak>;
export const StreakSchema = SchemaFactory.createForClass(Streak);

StreakSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });
StreakSchema.index({ tenantId: 1, currentDailyStreak: -1 });
