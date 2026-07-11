import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { BillingCycle, SubscriptionStatus } from '@shared/enums/billing.enum';

/**
 * Collection: subscriptions
 *
 * A tenant's subscription to a `Plan` from the global catalog.
 *
 * At most one *active* (non-deleted) subscription per tenant is enforced
 * at the schema level via a partial unique index on `{ tenantId }` scoped
 * to `isDeleted: false` (see below). Changing plans/cycles soft-deletes
 * the current document (`isDeleted: true`) and inserts a new one, so full
 * subscription history is retained for billing audit purposes without
 * ever violating the one-active-subscription-per-tenant rule.
 */
@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Plan', required: true })
  plan: Types.ObjectId;

  @Prop({ type: String, enum: SubscriptionStatus, required: true, default: SubscriptionStatus.TRIALING })
  status: SubscriptionStatus;

  @Prop({ type: String, enum: BillingCycle, required: true, default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  @Prop({ type: Date, required: true, default: () => new Date() })
  currentPeriodStart: Date;

  @Prop({ type: Date, required: true })
  currentPeriodEnd: Date;

  @Prop({ type: Boolean, default: false })
  cancelAtPeriodEnd: boolean;

  @Prop({ type: Date, required: false, default: null })
  cancelledAt?: Date | null;
}

export type SubscriptionDocument = HydratedDocument<Subscription>;
export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Partial unique index: only one *active* (non-deleted) subscription per
// tenant — deliberately NOT a bare `{ tenantId: 1 }` unique index, so a
// soft-deleted (superseded) subscription can coexist with history intact.
// Named explicitly: its key shape is identical to the inherited
// `tenantId` floor index from BaseSchema (same key, different options —
// partial + unique), which Mongoose's duplicate-index check only compares
// by key and would otherwise flag as a false-positive duplicate.
SubscriptionSchema.index(
  { tenantId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'tenantId_1_active_unique_partial',
  },
);
SubscriptionSchema.index({ tenantId: 1, status: 1, currentPeriodEnd: 1 });
