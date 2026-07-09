import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';
import { BillingCycle, Currency } from '@shared/enums/billing.enum';

/**
 * Collection: plans
 *
 * Platform-wide subscription plan catalog (NOT tenant-scoped) — what a
 * tenant can subscribe to. A tenant's active choice from this catalog is
 * recorded in `subscriptions`.
 */
@Schema({ timestamps: true, collection: 'plans' })
export class Plan extends BaseGlobalSchema {
  @Prop({ type: String, required: true, unique: true, trim: true, lowercase: true })
  code: string; // e.g. "starter", "growth", "enterprise"

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @Prop({ type: String, enum: Currency, required: true, default: Currency.SAR })
  currency: Currency;

  @Prop({ type: String, enum: BillingCycle, required: true, default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  @Prop({ type: Number, required: false, default: null })
  maxStudents?: number | null; // null = unlimited

  @Prop({ type: Number, required: false, default: null })
  maxSheikhs?: number | null;

  @Prop({ type: [String], default: [] })
  featureKeys: string[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export type PlanDocument = HydratedDocument<Plan>;
export const PlanSchema = SchemaFactory.createForClass(Plan);

PlanSchema.index({ code: 1 }, { unique: true });
PlanSchema.index({ isActive: 1 });
