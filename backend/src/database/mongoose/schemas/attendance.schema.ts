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
 */
@Schema({ timestamps: true, collection: 'attendance' })
export class Attendance extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  session: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: String, enum: AttendanceStatus, required: true, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Prop({ type: Date, required: false })
  checkedInAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  recordedBy?: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  remarks?: string;
}

export type AttendanceDocument = HydratedDocument<Attendance>;
export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

AttendanceSchema.index({ tenantId: 1, session: 1, student: 1 }, { unique: true });
AttendanceSchema.index({ tenantId: 1, student: 1, createdAt: -1 });
AttendanceSchema.index({ tenantId: 1, status: 1 });
