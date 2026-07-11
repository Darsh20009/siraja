import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { AssessmentStatus, AssessmentType } from '@shared/enums/exam-assignment.enum';
import { EvaluationGrade } from '@shared/enums/memorization.enum';

/**
 * Collection: assessments
 *
 * Periodic holistic student evaluations distinct from per-session memorization
 * records or formal exams. An assessment aggregates a student's performance
 * over a period (weekly, monthly, or custom window) into a single scored/graded
 * summary that can be included in parent and supervisor reports.
 *
 * Phase 8.
 */
@Schema({ timestamps: true, collection: 'assessments' })
export class Assessment extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: false })
  group?: Types.ObjectId;

  /** Sheikh/teacher who authored this assessment (User reference). */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assessedBy: Types.ObjectId;

  /** Period type: weekly / monthly / custom. */
  @Prop({ type: String, enum: AssessmentType, required: true, default: AssessmentType.WEEKLY })
  type: AssessmentType;

  @Prop({ type: String, enum: AssessmentStatus, required: true, default: AssessmentStatus.DRAFT })
  status: AssessmentStatus;

  /** Start of the assessment period. */
  @Prop({ type: Date, required: true })
  periodStart: Date;

  /** End of the assessment period. */
  @Prop({ type: Date, required: true })
  periodEnd: Date;

  @Prop({ type: Number, required: false, min: 0, max: 100 })
  score?: number;

  @Prop({ type: String, enum: EvaluationGrade, required: false })
  grade?: EvaluationGrade;

  /** Title / label for the assessment (e.g. "Week 12 – Juz 5 Revision"). */
  @Prop({ type: String, required: false, trim: true })
  title?: string;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;
}

export type AssessmentDocument = HydratedDocument<Assessment>;
export const AssessmentSchema = SchemaFactory.createForClass(Assessment);

AssessmentSchema.index({ tenantId: 1, student: 1, periodStart: -1 });
AssessmentSchema.index({ tenantId: 1, group: 1, type: 1, periodStart: -1 });
AssessmentSchema.index({ tenantId: 1, assessedBy: 1, createdAt: -1 });
AssessmentSchema.index({ tenantId: 1, status: 1 });
