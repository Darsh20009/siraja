import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { Currency, PaymentMethod, PaymentStatus } from '@shared/enums/billing.enum';

/**
 * Collection: payments
 *
 * A single payment attempt/charge against a tenant's `subscription`
 * (e.g. one per billing cycle, via a payment gateway). `transactions`
 * records the underlying ledger entries (charge/refund/payout) that a
 * payment can produce — kept separate since one payment can yield
 * multiple ledger transactions (e.g. a charge plus a later partial refund).
 */
@Schema({ timestamps: true, collection: 'payments' })
export class Payment extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: false })
  subscription?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String, enum: Currency, required: true, default: Currency.SAR })
  currency: Currency;

  @Prop({ type: String, enum: PaymentMethod, required: true, default: PaymentMethod.CARD })
  method: PaymentMethod;

  @Prop({ type: String, enum: PaymentStatus, required: true, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ type: String, required: false, trim: true })
  providerReference?: string; // external payment gateway id

  @Prop({ type: Date, required: false, default: null })
  paidAt?: Date | null;
}

export type PaymentDocument = HydratedDocument<Payment>;
export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ tenantId: 1, subscription: 1 });
PaymentSchema.index({ providerReference: 1 }, { unique: true, sparse: true });
