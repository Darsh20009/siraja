import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { AyahPerformanceStatus, HeatmapLevel } from '@shared/enums/smart-mushaf.enum';

/**
 * Collection: ayah_performance
 *
 * Materialised per-(student, ayah) learning state for the Smart Mushaf
 * Engine (Phase 9) — one document per ayah a student has ever touched
 * (memorized, revised, or made a mistake on). Kept materialised (like
 * `student_progress` in Phase 7) rather than computed on read, because
 * computing it live would require range-overlap joins against
 * `memorization_records`/`review_records` (whose ranges span ayahs, not
 * reference a single ayah) for every ayah in a surah — too expensive for
 * a page/surah-wide Smart Mushaf view. `heatmapLevel` is derived from
 * `confidenceScore`/`status` and recomputed at every write
 * (see `computeHeatmapLevel`), never derived on read.
 */
@Schema({ timestamps: true, collection: 'ayah_performance' })
export class AyahPerformance extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 114 })
  surahNumber: number;

  @Prop({ type: Number, required: true, min: 1 })
  ayahNumber: number;

  @Prop({
    type: String,
    enum: AyahPerformanceStatus,
    required: true,
    default: AyahPerformanceStatus.NOT_STARTED,
  })
  status: AyahPerformanceStatus;

  @Prop({ type: Number, required: true, min: 0, max: 100, default: 0 })
  confidenceScore: number;

  @Prop({ type: String, enum: HeatmapLevel, default: null })
  heatmapLevel: HeatmapLevel | null;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  mistakeCount: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  revisionCount: number;

  @Prop({ type: Date, default: null })
  lastMemorizedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastRevisedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastMistakeAt: Date | null;

  // ── Phase 12B: Mastery Score ──────────────────────────────────────────

  /**
   * Composite 0–100 mastery score computed by MasteryScoreEngine.
   * Replaces `confidenceScore` as the primary learning signal; kept in
   * sync with `confidenceScore` (confidenceScore := masteryScore) for
   * backwards compatibility with Phase 9 heatmap consumers.
   */
  @Prop({ type: Number, required: true, min: 0, max: 100, default: 0 })
  masteryScore: number;

  // ── Phase 12B: SM-2 Revision Scheduling ──────────────────────────────

  /**
   * SM-2 easiness factor. Initialised to 2.5, clamped to [1.3, 2.5].
   * Increases on excellent grades, decreases on poor grades.
   */
  @Prop({ type: Number, required: true, default: 2.5 })
  smEasinessFactor: number;

  /**
   * SM-2 current interval in days. 0 means the ayah has never been
   * successfully scheduled (never memorized with a passing grade).
   */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  smInterval: number;

  /**
   * SM-2 consecutive successful reviews without a failure/reset.
   * Drives the interval progression: rep=0→1day, rep=1→6days, rep≥2→EF×prev.
   */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  smRepetitions: number;

  /**
   * UTC date when SM-2 next schedules this ayah for revision.
   * null = not yet scheduled (ayah never memorized with a passing grade).
   * Queried as `smNextReviewDue <= now` to find overdue revisions.
   */
  @Prop({ type: Date, default: null })
  smNextReviewDue: Date | null;
}

export type AyahPerformanceDocument = HydratedDocument<AyahPerformance>;
export const AyahPerformanceSchema = SchemaFactory.createForClass(AyahPerformance);

AyahPerformanceSchema.index({ tenantId: 1, student: 1, surahNumber: 1, ayahNumber: 1 }, { unique: true });
AyahPerformanceSchema.index({ tenantId: 1, student: 1, heatmapLevel: 1 });
AyahPerformanceSchema.index({ tenantId: 1, student: 1, surahNumber: 1 });
// Phase 12B: efficient "overdue revisions" query
AyahPerformanceSchema.index({ tenantId: 1, student: 1, smNextReviewDue: 1 });
