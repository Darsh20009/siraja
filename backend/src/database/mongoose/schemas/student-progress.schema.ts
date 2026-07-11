import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: student_progress
 *
 * Materialised progress summary per student per tenant.
 * One document per student — upserted whenever a memorization or review
 * record is created/approved. Avoids expensive on-the-fly aggregations
 * for frequently-read progress dashboards.
 *
 * Total Quran reference figures (used for percentage calculations):
 *   6,236 ayahs · 604 pages · 30 juz
 */
@Schema({ timestamps: true, collection: 'student_progress' })
export class StudentProgress extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  // ── Memorization ──────────────────────────────────────────────────────────

  /** Total number of ayahs the student has memorized (completed records). */
  @Prop({ type: Number, default: 0, min: 0 })
  totalAyahsMemorized: number;

  /** Derived pages memorized (totalAyahsMemorized / ~10.3 ayahs per page). */
  @Prop({ type: Number, default: 0, min: 0 })
  totalPagesMemorized: number;

  /** Full juz completed (floor of totalAyahsMemorized / ~207.9 per juz). */
  @Prop({ type: Number, default: 0, min: 0, max: 30 })
  totalJuzMemorized: number;

  /** Percentage of full Quran memorized (totalAyahsMemorized / 6236 × 100). */
  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  memorizationPercentage: number;

  /** Number of memorization sessions logged. */
  @Prop({ type: Number, default: 0, min: 0 })
  totalMemorizationSessions: number;

  @Prop({ type: Date, default: null })
  lastMemorizationDate: Date | null;

  // ── Revision ──────────────────────────────────────────────────────────────

  /** Total ayahs covered in revision sessions (may exceed totalAyahsMemorized
   *  since the same ayah can be revised many times). */
  @Prop({ type: Number, default: 0, min: 0 })
  totalAyahsRevised: number;

  /** Percentage of memorized material that has been revised at least once. */
  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  revisionPercentage: number;

  /** Number of revision sessions logged. */
  @Prop({ type: Number, default: 0, min: 0 })
  totalRevisionSessions: number;

  @Prop({ type: Date, default: null })
  lastRevisionDate: Date | null;

  // ── Streaks ───────────────────────────────────────────────────────────────

  /** Consecutive calendar days with at least one memorization or revision
   *  record. Resets to 0 when a day is missed. */
  @Prop({ type: Number, default: 0, min: 0 })
  currentStreak: number;

  /** All-time longest consecutive-day streak. */
  @Prop({ type: Number, default: 0, min: 0 })
  longestStreak: number;

  /** Date of the most recent activity (memorization or revision). */
  @Prop({ type: Date, default: null })
  lastActivityDate: Date | null;
}

export type StudentProgressDocument = HydratedDocument<StudentProgress>;
export const StudentProgressSchema = SchemaFactory.createForClass(StudentProgress);

// Unique: one progress document per student per tenant.
StudentProgressSchema.index({ tenantId: 1, student: 1 }, { unique: true });
