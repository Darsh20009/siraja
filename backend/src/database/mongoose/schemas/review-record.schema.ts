import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { EvaluationGrade } from '@shared/enums/memorization.enum';
import { QuranRange, QuranRangeSchema } from './memorization-record.schema';

/**
 * Collection: review_records
 *
 * One document per revision ("murajaʿah") session of previously
 * memorized material — distinct from `memorization_records` (new
 * material) because review cadence/metrics (retention grade, due date for
 * next review) differ from initial-memorization evaluation.
 */
@Schema({ timestamps: true, collection: 'review_records' })
export class ReviewRecord extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: false })
  session?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewedBy: Types.ObjectId; // sheikh

  @Prop({ type: QuranRangeSchema, required: true })
  range: QuranRange;

  @Prop({ type: String, enum: EvaluationGrade, required: false })
  retentionGrade?: EvaluationGrade;

  @Prop({ type: Date, required: false })
  nextReviewDueAt?: Date;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;

  @Prop({ type: Date, required: true, default: () => new Date() })
  reviewedAt: Date;
}

export type ReviewRecordDocument = HydratedDocument<ReviewRecord>;
export const ReviewRecordSchema = SchemaFactory.createForClass(ReviewRecord);

ReviewRecordSchema.index({ tenantId: 1, student: 1, reviewedAt: -1 });
ReviewRecordSchema.index({ tenantId: 1, nextReviewDueAt: 1 });
