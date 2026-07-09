import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { SessionStatus, SessionType } from '@shared/enums/session-status.enum';

/**
 * Collection: sessions
 *
 * A single scheduled/held meeting of a `Group` (a class/halaqah session).
 * `attendance`, and typically `memorization_records`/`review_records`,
 * reference a session by ObjectId rather than embedding — sessions are
 * long-lived and queried independently (e.g. "list all sessions this
 * month"), so child records stay in their own collections for
 * unbounded growth.
 */
@Schema({ timestamps: true, collection: 'sessions' })
export class Session extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  group: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  sheikh?: Types.ObjectId;

  @Prop({ type: String, enum: SessionType, required: true, default: SessionType.MEMORIZATION })
  type: SessionType;

  @Prop({ type: String, enum: SessionStatus, required: true, default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  @Prop({ type: Date, required: true })
  scheduledAt: Date;

  @Prop({ type: Date, required: false })
  startedAt?: Date;

  @Prop({ type: Date, required: false })
  endedAt?: Date;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;
}

export type SessionDocument = HydratedDocument<Session>;
export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ tenantId: 1, group: 1, scheduledAt: -1 });
SessionSchema.index({ tenantId: 1, sheikh: 1, scheduledAt: -1 });
SessionSchema.index({ tenantId: 1, status: 1 });
