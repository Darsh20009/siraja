import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { AiReportType } from '@shared/enums/ai.enum';

/**
 * Collection: ai_reports
 *
 * The durable output of a completed `ai_requests` job — this is both the
 * audit trail (every AI-generated artifact is persisted, never only
 * in-memory) and the cache: a later request for the same `type` +
 * `student` whose `sourceDataHash` still matches returns this document
 * instead of calling the LLM again (see `AiInsightRepository.findCached`).
 *
 * `summary.content` holds the Arabic narrative text; `summary.structured`
 * (optional) holds any structured data the use-case assembled alongside
 * it (e.g. the deterministic forecast numbers a forecast explanation was
 * generated from) — kept as a free-form object since each feature's
 * structured payload shape differs, mirroring how `inputPayload` on
 * `AiRequest` is also free-form.
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

  /**
   * Hash of the underlying platform data (mistakes, progress, performance,
   * etc.) this report was generated from. Regenerated only when the hash
   * changes — the primary cost-control lever (see AI Safety & Cost
   * Control strategy, docs/architecture/13-...).
   */
  @Prop({ type: String, required: true, index: true })
  sourceDataHash: string;

  /** Moonshot model identifier used to generate this report, for audit/debugging. */
  @Prop({ type: String, required: false, default: null })
  modelVersion: string | null;

  /** Sheikh/Admin acknowledgement — AI output is advisory, never authoritative on its own. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  acknowledgedBy: Types.ObjectId | null;

  @Prop({ type: Date, required: false, default: null })
  acknowledgedAt: Date | null;
}

export type AiReportDocument = HydratedDocument<AiReport>;
export const AiReportSchema = SchemaFactory.createForClass(AiReport);

AiReportSchema.index({ tenantId: 1, request: 1 }, { unique: true });
AiReportSchema.index({ tenantId: 1, student: 1, createdAt: -1 });
AiReportSchema.index({ tenantId: 1, type: 1, student: 1, sourceDataHash: 1 });
