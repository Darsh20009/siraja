import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { AttendanceStatus } from '@shared/enums/attendance-status.enum';

/**
 * Collection: attendance
 *
 * One document per (session, student) pair. Kept as its own collection
 * (not embedded in `sessions`) because attendance is written/queried
 * independently per student (e.g. a student's attendance history across
 * many sessions) and a session can have many students — an unbounded
 * embedded array would risk the 16MB document limit at scale.
 *
 * Phase 8: added `group`, `sheikh`, and explicit `date` fields for richer
 * circle-level attendance tracking and cross-circle reporting.
 */
@Schema({ timestamps: true, collection: 'attendance' })
export class Attendance extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Session', required: false })
  session?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  /** Circle/group the student attended — denormalised for query performance. */
  @Prop({ type: Types.ObjectId, ref: 'Group', required: false })
  group?: Types.ObjectId;

  /** Sheikh (User reference) who took the attendance. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  sheikh?: Types.ObjectId;

  @Prop({ type: String, enum: AttendanceStatus, required: true, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  /** Explicit date the attendance was taken (may differ from session date). */
  @Prop({ type: Date, required: true, default: () => new Date() })
  date: Date;

  @Prop({ type: Date, required: false })
  checkedInAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  recordedBy?: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;
}

export type AttendanceDocument = HydratedDocument<Attendance>;
export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// `partialFilterExpression`, not `sparse: true` — see the identical note
// on `UserSchema`'s email/phone indexes: `student` (and `tenantId`) are
// always present here, so a plain sparse compound index would never
// actually exclude session-less attendance records, letting only ONE
// session-less attendance record per student per tenant ever be created.
AttendanceSchema.index(
  { tenantId: 1, session: 1, student: 1 },
  { unique: true, partialFilterExpression: { session: { $type: 'objectId' } } },
);
AttendanceSchema.index({ tenantId: 1, student: 1, date: -1 });
AttendanceSchema.index({ tenantId: 1, group: 1, date: -1 });
AttendanceSchema.index({ tenantId: 1, sheikh: 1, date: -1 });
AttendanceSchema.index({ tenantId: 1, status: 1 });
