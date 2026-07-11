import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { MessageStatus } from '@shared/enums/messaging.enum';

/**
 * Collection: messages
 *
 * Individual messages within a MessageThread.
 * Owned by the sender, scoped to a thread.
 *
 * Phase 10: Communication & Notification Platform.
 */
@Schema({ timestamps: true, collection: 'messages' })
export class Message extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'MessageThread', required: true })
  threadId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 5000 })
  body: string;

  @Prop({ type: String, enum: MessageStatus, required: true, default: MessageStatus.SENT })
  status: MessageStatus;

  /** userId → readAt timestamp. */
  @Prop({ type: Map, of: Date, default: () => new Map() })
  readBy: Map<string, Date>;

  /** Optional reference to a resource (e.g. a memorization record, assignment). */
  @Prop({ type: String, required: false, trim: true })
  refType?: string;

  @Prop({ type: Types.ObjectId, required: false })
  refId?: Types.ObjectId;
}

export type MessageDocument = HydratedDocument<Message>;
export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ tenantId: 1, threadId: 1, createdAt: 1 });
MessageSchema.index({ tenantId: 1, senderId: 1 });
