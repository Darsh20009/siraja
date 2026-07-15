import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { TicketStatus, TicketPriority, TicketCategory } from '@shared/enums/support.enum';
import { BaseSchema } from './base.schema';

export type SupportTicketDocument = HydratedDocument<SupportTicket>;

/**
 * Collection: support_tickets
 *
 * A support ticket submitted by a user (tenant member or anonymous).
 * Phase 12E: extended with assignment, resolution workflow, and the
 * new TicketCategory values (account, content, feature_request, other).
 */
@Schema({ collection: 'support_tickets', timestamps: true })
export class SupportTicket extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  submittedBy: Types.ObjectId;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: String, enum: TicketCategory, default: TicketCategory.GENERAL })
  category: TicketCategory;

  @Prop({ type: String, enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Prop({ type: String, enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Date })
  assignedAt?: Date;

  @Prop()
  resolutionNote?: string;

  @Prop({ type: Date })
  resolvedAt?: Date;

  @Prop({ type: Types.ObjectId })
  resolvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  closedAt?: Date;

  @Prop({ type: [String], default: [] })
  attachmentUrls: string[];
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
SupportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });
SupportTicketSchema.index({ assignedTo: 1, status: 1 });
SupportTicketSchema.index({ submittedBy: 1 });
