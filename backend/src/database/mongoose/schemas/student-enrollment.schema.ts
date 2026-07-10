import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { EnrollmentType } from '@shared/enums/enrollment-type.enum';

/**
 * Collection: student_enrollments
 *
 * Immutable audit log of every circle/sheikh assignment event for a
 * student — answers "who assigned this student to which circle, when,
 * and what were they moved from?" without mutating `Student.group`.
 *
 * The current assignment is always authoritative on `Student.group` /
 * `Student.sheikh`; this collection is history only.
 */
@Schema({ timestamps: true, collection: 'student_enrollments' })
export class StudentEnrollment extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  student: Types.ObjectId;

  @Prop({ type: String, enum: EnrollmentType, required: true })
  enrollmentType: EnrollmentType;

  /** Circle the student was assigned/moved TO (null for sheikh-only events). */
  @Prop({ type: Types.ObjectId, ref: 'Group', required: false, default: null })
  circle?: Types.ObjectId | null;

  /** Circle the student was moved FROM (reassignment events only). */
  @Prop({ type: Types.ObjectId, ref: 'Group', required: false, default: null })
  previousCircle?: Types.ObjectId | null;

  /** Sheikh involved (sheikh assignment events + any circle that has a sheikh). */
  @Prop({ type: Types.ObjectId, ref: 'Sheikh', required: false, default: null })
  sheikh?: Types.ObjectId | null;

  /** User (Tenant Admin or Supervisor) who performed the assignment. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedBy: Types.ObjectId;

  @Prop({ type: Date, required: true, default: () => new Date() })
  effectiveDate: Date;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;
}

export type StudentEnrollmentDocument = HydratedDocument<StudentEnrollment>;
export const StudentEnrollmentSchema = SchemaFactory.createForClass(StudentEnrollment);

StudentEnrollmentSchema.index({ tenantId: 1, student: 1, createdAt: -1 });
StudentEnrollmentSchema.index({ tenantId: 1, circle: 1, createdAt: -1 });
StudentEnrollmentSchema.index({ tenantId: 1, sheikh: 1, createdAt: -1 });
