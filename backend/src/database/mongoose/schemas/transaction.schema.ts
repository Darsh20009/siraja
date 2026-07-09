import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { Currency, TransactionStatus, TransactionType } from '@shared/enums/billing.enum';

/**
 * Collection: transactions
 *
 * Immutable ledger entry produced by a `payment` (charge, refund, payout,
 * or manual adjustment). Append-only by convention — corrections are made
 * via a new offsetting transaction, never by mutating an existing one.
 */
@Schema({ timestamps: true, collection: 'transactions' })
export class Transaction extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Payment', required: false })
  payment?: Types.ObjectId;

  @Prop({ type: String, enum: TransactionType, required: true })
  type: TransactionType;

  @Prop({ type: String, enum: TransactionStatus, required: true, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Prop({ type: Number, required: true })
  amount: number; // signed: negative for refunds/adjustments-out

  @Prop({ type: String, enum: Currency, required: true, default: Currency.SAR })
  currency: Currency;

  @Prop({ type: String, required: false, trim: true })
  description?: string;
}

export type TransactionDocument = HydratedDocument<Transaction>;
export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ tenantId: 1, createdAt: -1 });
TransactionSchema.index({ tenantId: 1, payment: 1 });
TransactionSchema.index({ tenantId: 1, type: 1, status: 1 });
