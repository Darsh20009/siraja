import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '@shared/enums/notification.enum';

/**
 * Collection: notifications
 *
 * One document per notification delivered (or attempted) to a user across
 * any channel. High write/read volume, always accessed per-user — indexed
 * accordingly for an inbox-style "unread first" query pattern.
 */
@Schema({ timestamps: true, collection: 'notifications' })
export class Notification extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ type: String, enum: NotificationChannel, required: true, default: NotificationChannel.IN_APP })
  channel: NotificationChannel;

  @Prop({ type: String, enum: NotificationStatus, required: true, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  body: string;

  @Prop({ type: Object, required: false, default: {} })
  data?: Record<string, unknown>; // deep-link/context payload

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Date, required: false, default: null })
  readAt?: Date | null;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ tenantId: 1, recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, type: 1 });
NotificationSchema.index({ tenantId: 1, status: 1 });
