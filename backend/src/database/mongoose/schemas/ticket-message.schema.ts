import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketMessageDocument = TicketMessage & Document;

@Schema({ collection: 'ticket_messages', timestamps: true })
export class TicketMessage {
  @Prop({ type: Types.ObjectId, ref: 'SupportTicket', required: true })
  ticketId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sentBy: Types.ObjectId;

  @Prop({ required: true })
  body: string;

  @Prop({ default: false })
  isStaffReply: boolean;

  @Prop({ default: false })
  isInternal: boolean; // internal staff note, not visible to submitter

  @Prop({ type: [String], default: [] })
  attachmentUrls: string[];
}

export const TicketMessageSchema = SchemaFactory.createForClass(TicketMessage);
TicketMessageSchema.index({ ticketId: 1, createdAt: 1 });
TicketMessageSchema.index({ sentBy: 1 });
