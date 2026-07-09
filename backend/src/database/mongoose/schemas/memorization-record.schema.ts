import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { EvaluationGrade, MemorizationStatus } from '@shared/enums/memorization.enum';

/**
 * Embedded value object — the Quran range covered by one record. Embedded
 * (not a separate collection) because it is small, fixed-shape, and only
 * ever meaningful attached to its parent record.
 */
@Schema({ _id: false })
export class QuranRange {
  @Prop({ type: Number, required: true, min: 1, max: 114 })
  surahFrom: number;

  @Prop({ type: Number, required: true, min: 1 })
  ayahFrom: number;

  @Prop({ type: Number, required: true, min: 1, max: 114 })
  surahTo: number;

  @Prop({ type: Number, required: true, min: 1 })
  ayahTo: number;
}
export const QuranRangeSchema = SchemaFactory.createForClass(QuranRange);

/**
 * Collection: memorization_records
 *
 * One document per memorization evaluation of a new portion by a student.
 * `quran_mistakes` referencing this record's `_id` hold the detailed
 * mistake breakdown, kept separate since a record can accumulate many
 * mistakes and mistakes are also independently reportable/queryable.
 */
@Schema({ timestamps: true, collection: 'memorization_records' })
export class MemorizationRecord extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: false })
  session?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  evaluatedBy: Types.ObjectId; // sheikh

  @Prop({ type: QuranRangeSchema, required: true })
  range: QuranRange;

  @Prop({ type: String, enum: MemorizationStatus, required: true, default: MemorizationStatus.IN_PROGRESS })
  status: MemorizationStatus;

  @Prop({ type: String, enum: EvaluationGrade, required: false })
  grade?: EvaluationGrade;

  @Prop({ type: Number, required: false, min: 0, max: 100 })
  score?: number;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;

  @Prop({ type: Date, required: true, default: () => new Date() })
  evaluatedAt: Date;
}

export type MemorizationRecordDocument = HydratedDocument<MemorizationRecord>;
export const MemorizationRecordSchema = SchemaFactory.createForClass(MemorizationRecord);

MemorizationRecordSchema.index({ tenantId: 1, student: 1, evaluatedAt: -1 });
MemorizationRecordSchema.index({ tenantId: 1, evaluatedBy: 1, evaluatedAt: -1 });
MemorizationRecordSchema.index({ tenantId: 1, status: 1 });
