import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { AiReportType } from '@shared/enums/ai.enum';

/**
 * Collection: ai_reports
 *
 * The durable output of a completed `ai_requests` job.
 */
@Schema({ timestamps: true, collection: 'ai_reports' })
export class AiReport extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'AiRequest', required: true })
  request: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: false })
  student?: Types.ObjectId;

  @Prop({ type: String, enum: AiReportType, required: true })
  type: AiReportType;

  @Prop({ type: Object, required: true })
  summary: Record<string, unknown>;

  @Prop({ type: Number, required: false, min: 0, max: 1 })
  confidenceScore?: number;
}

export type AiReportDocument = HydratedDocument<AiReport>;
export const AiReportSchema = SchemaFactory.createForClass(AiReport);

AiReportSchema.index({ tenantId: 1, request: 1 }, { unique: true });
AiReportSchema.index({ tenantId: 1, student: 1, createdAt: -1 });
