import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { AiFeatureType } from '@shared/enums/ai.enum';

/**
 * Collection: ai_usage_ledger
 *
 * One row per Moonshot AI call (successful or not — failed calls that
 * still consumed tokens are recorded too). This is the cost-control audit
 * trail: `AiCostGuardService` sums recent rows against the configured
 * daily/monthly budgets (`MOONSHOT_DAILY_BUDGET_USD` /
 * `MOONSHOT_MONTHLY_BUDGET_USD`) before allowing a new call, and Super
 * Admin can inspect per-tenant, per-feature spend from this collection
 * directly. Never aggregated/rolled up elsewhere — this is the source of
 * truth for AI spend.
 */
@Schema({ timestamps: true, collection: 'ai_usage_ledger' })
export class AiUsageLedger extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requestedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: false, default: null })
  student: Types.ObjectId | null;

  @Prop({ type: String, enum: AiFeatureType, required: true })
  featureTag: AiFeatureType;

  @Prop({ type: Number, required: true, min: 0 })
  promptTokens: number;

  @Prop({ type: Number, required: true, min: 0 })
  completionTokens: number;

  @Prop({ type: Number, required: true, min: 0 })
  estimatedCostUsd: number;

  @Prop({ type: String, required: false, default: null })
  modelVersion: string | null;
}

export type AiUsageLedgerDocument = HydratedDocument<AiUsageLedger>;
export const AiUsageLedgerSchema = SchemaFactory.createForClass(AiUsageLedger);

AiUsageLedgerSchema.index({ tenantId: 1, createdAt: -1 });
AiUsageLedgerSchema.index({ tenantId: 1, featureTag: 1, createdAt: -1 });
