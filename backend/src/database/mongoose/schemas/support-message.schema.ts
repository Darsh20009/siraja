import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { SenderType } from '@shared/enums/support.enum';

/**
 * Collection: support_messages
 *
 * One document per message within a `support_tickets` thread.
 */
@Schema({ timestamps: true, collection: 'support_messages' })
export class SupportMessage extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'SupportTicket', required: true })
  ticket: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  sender?: Types.ObjectId;

  @Prop({ type: String, enum: SenderType, required: true, default: SenderType.USER })
  senderType: SenderType;

  @Prop({ type: String, required: true, trim: true })
  message: string;

  @Prop({ type: [String], default: [] })
  attachmentUrls: string[];
}

export type SupportMessageDocument = HydratedDocument<SupportMessage>;
export const SupportMessageSchema = SchemaFactory.createForClass(SupportMessage);

SupportMessageSchema.index({ tenantId: 1, ticket: 1, createdAt: 1 });
