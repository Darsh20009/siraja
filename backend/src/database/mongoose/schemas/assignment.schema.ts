import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { AssignmentStatus, AssignmentType } from '@shared/enums/exam-assignment.enum';

/**
 * Collection: assignments
 *
 * Homework/practice tasks a sheikh assigns to a student (or a whole
 * group — `student` is set per-student when fanned out, so progress is
 * trackable individually).
 *
 * Phase 8: added `type` (Homework / Revision Task / Memorization Task)
 * and `submissionNotes` for richer student-submitted context.
 */
@Schema({ timestamps: true, collection: 'assignments' })
export class Assignment extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: false })
  group?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedBy: Types.ObjectId;

  /** Nature of the task: homework, revision task, or memorization task. */
  @Prop({ type: String, enum: AssignmentType, required: true, default: AssignmentType.HOMEWORK })
  type: AssignmentType;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: String, enum: AssignmentStatus, required: true, default: AssignmentStatus.ASSIGNED })
  status: AssignmentStatus;

  @Prop({ type: Date, required: false })
  dueAt?: Date;

  @Prop({ type: Date, required: false })
  submittedAt?: Date;

  /** Notes left by the student when submitting. */
  @Prop({ type: String, required: false, trim: true })
  submissionNotes?: string;

  /** Sheikh's review feedback after marking the submission. */
  @Prop({ type: String, required: false, trim: true })
  feedback?: string;
}

export type AssignmentDocument = HydratedDocument<Assignment>;
export const AssignmentSchema = SchemaFactory.createForClass(Assignment);

AssignmentSchema.index({ tenantId: 1, student: 1, status: 1 });
AssignmentSchema.index({ tenantId: 1, student: 1, dueAt: 1 });
AssignmentSchema.index({ tenantId: 1, group: 1, type: 1 });
AssignmentSchema.index({ tenantId: 1, assignedBy: 1, createdAt: -1 });
AssignmentSchema.index({ tenantId: 1, dueAt: 1 });
