import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { ExamCategory, ExamResult, ExamStatus, ExamType } from '@shared/enums/exam-assignment.enum';
import { EvaluationGrade } from '@shared/enums/memorization.enum';
import { QuranRange, QuranRangeSchema } from './memorization-record.schema';

/**
 * Collection: exams
 *
 * A formal evaluation event for a student (or a whole group, via multiple
 * exam documents sharing the same `group`+date). Kept distinct from
 * `memorization_records`/`review_records` since exams have grading
 * workflow states (`ExamStatus`) and a formal numeric result.
 *
 * Phase 8: added `category` (Memorization/Revision/Completion), `grade`
 * (EvaluationGrade) and `result` (Pass/Fail/Pending) for full exam lifecycle.
 */
@Schema({ timestamps: true, collection: 'exams' })
export class Exam extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: false })
  group?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  examiner?: Types.ObjectId;

  /** Content category: what is being examined (memorization / revision / completion). */
  @Prop({ type: String, enum: ExamCategory, required: true, default: ExamCategory.MEMORIZATION })
  category: ExamCategory;

  /** Format of the exam: oral, written, or mixed. */
  @Prop({ type: String, enum: ExamType, required: true, default: ExamType.ORAL })
  type: ExamType;

  @Prop({ type: String, enum: ExamStatus, required: true, default: ExamStatus.SCHEDULED })
  status: ExamStatus;

  @Prop({ type: QuranRangeSchema, required: false })
  range?: QuranRange;

  @Prop({ type: Date, required: true })
  scheduledAt: Date;

  @Prop({ type: Number, required: false, min: 0, max: 100 })
  score?: number;

  /** Qualitative grade assigned by the examiner. */
  @Prop({ type: String, enum: EvaluationGrade, required: false })
  grade?: EvaluationGrade;

  /** Pass / Fail / Pending — set when status transitions to GRADED. */
  @Prop({ type: String, enum: ExamResult, required: true, default: ExamResult.PENDING })
  result: ExamResult;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;
}

export type ExamDocument = HydratedDocument<Exam>;
export const ExamSchema = SchemaFactory.createForClass(Exam);

ExamSchema.index({ tenantId: 1, student: 1, scheduledAt: -1 });
ExamSchema.index({ tenantId: 1, group: 1, scheduledAt: -1 });
ExamSchema.index({ tenantId: 1, status: 1 });
ExamSchema.index({ tenantId: 1, category: 1, scheduledAt: -1 });
ExamSchema.index({ tenantId: 1, examiner: 1, scheduledAt: -1 });
