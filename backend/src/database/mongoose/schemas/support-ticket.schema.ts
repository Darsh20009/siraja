import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { TicketCategory, TicketPriority, TicketStatus } from '@shared/enums/support.enum';

/**
 * Collection: support_tickets
 *
 * A support case opened by a tenant user. Messages are stored separately
 * in `support_messages` (one-to-many, unbounded thread) rather than
 * embedded, since a ticket's conversation can grow indefinitely.
 */
@Schema({ timestamps: true, collection: 'support_tickets' })
export class SupportTicket extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  openedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  assignedTo?: Types.ObjectId | null; // support agent (platform-level)

  @Prop({ type: String, required: true, trim: true })
  subject: string;

  @Prop({ type: String, enum: TicketCategory, required: true, default: TicketCategory.GENERAL })
  category: TicketCategory;

  @Prop({ type: String, enum: TicketPriority, required: true, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Prop({ type: String, enum: TicketStatus, required: true, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Prop({ type: Date, required: false, default: null })
  resolvedAt?: Date | null;
}

export type SupportTicketDocument = HydratedDocument<SupportTicket>;
export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);

SupportTicketSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
SupportTicketSchema.index({ tenantId: 1, openedBy: 1 });
SupportTicketSchema.index({ tenantId: 1, assignedTo: 1, status: 1 });
