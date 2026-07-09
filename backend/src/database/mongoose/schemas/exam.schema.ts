import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { ExamStatus, ExamType } from '@shared/enums/exam-assignment.enum';
import { QuranRange, QuranRangeSchema } from './memorization-record.schema';

/**
 * Collection: exams
 *
 * A formal evaluation event for a student (or a whole group, via multiple
 * exam documents sharing the same `group`+date). Kept distinct from
 * `memorization_records`/`review_records` since exams have grading
 * workflow states (`ExamStatus`) and a formal numeric result.
 */
@Schema({ timestamps: true, collection: 'exams' })
export class Exam extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: false })
  group?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  examiner?: Types.ObjectId;

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

  @Prop({ type: String, required: false, trim: true })
  feedback?: string;
}

export type ExamDocument = HydratedDocument<Exam>;
export const ExamSchema = SchemaFactory.createForClass(Exam);

ExamSchema.index({ tenantId: 1, student: 1, scheduledAt: -1 });
ExamSchema.index({ tenantId: 1, group: 1, scheduledAt: -1 });
ExamSchema.index({ tenantId: 1, status: 1 });
