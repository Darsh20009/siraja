import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { PointActivityType } from '@shared/enums/gamification.enum';

/**
 * Collection: point_transactions
 *
 * Append-only immutable ledger of every point-earning event.
 * The StudentPoints document is the materialised view derived from this.
 */
@Schema({ timestamps: true, collection: 'point_transactions' })
export class PointTransaction extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: String, enum: PointActivityType, required: true })
  activityType: PointActivityType;

  @Prop({ type: Number, required: true, min: 0 })
  points: number;

  /** ID of the triggering domain entity (recordId, sessionId, examId …). */
  @Prop({ type: String, required: false })
  referenceId?: string;

  /** Collection name of the reference, for cross-module traceability. */
  @Prop({ type: String, required: false })
  referenceType?: string;

  /** ISO date string of the moment the activity occurred (may differ from createdAt). */
  @Prop({ type: String, required: true })
  activityDate: string; // YYYY-MM-DD

  @Prop({ type: Object, required: false })
  metadata?: Record<string, unknown>;
}

export type PointTransactionDocument = HydratedDocument<PointTransaction>;
export const PointTransactionSchema = SchemaFactory.createForClass(PointTransaction);

PointTransactionSchema.index({ tenantId: 1, studentId: 1, activityDate: -1 });
PointTransactionSchema.index({ tenantId: 1, studentId: 1, activityType: 1 });
PointTransactionSchema.index({ tenantId: 1, activityDate: 1 });
