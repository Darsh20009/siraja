import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { ThreadType } from '@shared/enums/messaging.enum';

/**
 * Collection: message_threads
 *
 * A conversation thread between a sender and one or more recipients.
 * Supports the four Phase 10 messaging patterns:
 *   SHEIKH_STUDENT, SHEIKH_PARENT, ADMIN_USER, SUPERVISOR_CIRCLE
 *
 * Phase 10: Communication & Notification Platform.
 */
@Schema({ timestamps: true, collection: 'message_threads' })
export class MessageThread extends BaseSchema {
  @Prop({ type: String, enum: ThreadType, required: true })
  type: ThreadType;

  /** The user who initiated the thread. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  /** All participants — sender + recipients. */
  @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
  participants: Types.ObjectId[];

  /** Optional circle reference (for SUPERVISOR_CIRCLE threads). */
  @Prop({ type: Types.ObjectId, ref: 'Group', required: false })
  circleId?: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  subject?: string;

  /** Snapshot of the last message for inbox preview. */
  @Prop({ type: String, required: false, trim: true })
  lastMessagePreview?: string;

  @Prop({ type: Date, required: false })
  lastMessageAt?: Date;

  /** Number of unread messages per participant userId → count. */
  @Prop({ type: Map, of: Number, default: () => new Map() })
  unreadCounts: Map<string, number>;

  @Prop({ type: Boolean, default: false })
  isArchived: boolean;
}

export type MessageThreadDocument = HydratedDocument<MessageThread>;
export const MessageThreadSchema = SchemaFactory.createForClass(MessageThread);

MessageThreadSchema.index({ tenantId: 1, participants: 1, lastMessageAt: -1 });
MessageThreadSchema.index({ tenantId: 1, circleId: 1 });
MessageThreadSchema.index({ tenantId: 1, createdBy: 1 });
