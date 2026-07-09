import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { AiRequestStatus, AiRequestType } from '@shared/enums/ai.enum';

/**
 * Collection: ai_requests
 *
 * One document per AI job requested (e.g. recitation analysis). Kept
 * separate from `ai_reports` because a request is a queued/async unit of
 * work with its own lifecycle status, while a report is the durable
 * output artifact a request produces (a request can fail and produce no
 * report at all).
 */
@Schema({ timestamps: true, collection: 'ai_requests' })
export class AiRequest extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requestedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: false })
  student?: Types.ObjectId;

  @Prop({ type: String, enum: AiRequestType, required: true })
  type: AiRequestType;

  @Prop({ type: String, enum: AiRequestStatus, required: true, default: AiRequestStatus.QUEUED })
  status: AiRequestStatus;

  @Prop({ type: Object, required: false, default: {} })
  inputPayload?: Record<string, unknown>;

  @Prop({ type: String, required: false, trim: true })
  errorMessage?: string;

  @Prop({ type: Date, required: false, default: null })
  completedAt?: Date | null;
}

export type AiRequestDocument = HydratedDocument<AiRequest>;
export const AiRequestSchema = SchemaFactory.createForClass(AiRequest);

AiRequestSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
AiRequestSchema.index({ tenantId: 1, student: 1 });
AiRequestSchema.index({ tenantId: 1, requestedBy: 1 });
