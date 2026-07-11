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
}

export type AyahPerformanceDocument = HydratedDocument<AyahPerformance>;
export const AyahPerformanceSchema = SchemaFactory.createForClass(AyahPerformance);

AyahPerformanceSchema.index({ tenantId: 1, student: 1, surahNumber: 1, ayahNumber: 1 }, { unique: true });
AyahPerformanceSchema.index({ tenantId: 1, student: 1, heatmapLevel: 1 });
AyahPerformanceSchema.index({ tenantId: 1, student: 1, surahNumber: 1 });
