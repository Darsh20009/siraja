import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { MistakeSeverity, MistakeType } from '@shared/enums/memorization.enum';

/**
 * Collection: quran_mistakes
 *
 * Fine-grained mistake log linked to either a `memorization_records` or
 * `review_records` document (exactly one of `memorizationRecord` /
 * `reviewRecord` is set). Kept as its own collection — not embedded —
 * because a single evaluation can log many mistakes and mistakes are
 * independently aggregated/reported (e.g. "most common Tajweed mistakes
 * for this student this month").
 */
@Schema({ timestamps: true, collection: 'quran_mistakes' })
export class QuranMistake extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MemorizationRecord', required: false })
  memorizationRecord?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ReviewRecord', required: false })
  reviewRecord?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 114 })
  surahNumber: number;

  @Prop({ type: Number, required: true, min: 1 })
  ayahNumber: number;

  @Prop({ type: String, enum: MistakeType, required: true })
  type: MistakeType;

  @Prop({ type: String, enum: MistakeSeverity, required: true, default: MistakeSeverity.MINOR })
  severity: MistakeSeverity;

  @Prop({ type: String, required: false, trim: true })
  note?: string;
}

export type QuranMistakeDocument = HydratedDocument<QuranMistake>;
export const QuranMistakeSchema = SchemaFactory.createForClass(QuranMistake);

QuranMistakeSchema.index({ tenantId: 1, student: 1, createdAt: -1 });
QuranMistakeSchema.index({ tenantId: 1, memorizationRecord: 1 });
QuranMistakeSchema.index({ tenantId: 1, reviewRecord: 1 });
QuranMistakeSchema.index({ tenantId: 1, type: 1 });
