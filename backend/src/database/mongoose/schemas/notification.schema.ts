import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '@shared/enums/notification.enum';

/**
 * Collection: notifications
 *
 * One document per notification delivered (or attempted) to a user across
 * any channel. High write/read volume, always accessed per-user — indexed
 * accordingly for an inbox-style "unread first" query pattern.
 *
 * Phase 10: added priority, isArchived, archivedAt, deepLink.
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

  @Prop({ type: String, enum: NotificationPriority, required: true, default: NotificationPriority.NORMAL })
  priority: NotificationPriority;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  body: string;

  /** Contextual payload passed to the frontend for deep linking. */
  @Prop({ type: Object, required: false, default: {} })
  data?: Record<string, unknown>;

  /** Deep-link URL (e.g. /circles/:id, /assignments/:id). */
  @Prop({ type: String, required: false, trim: true })
  deepLink?: string;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Date, required: false, default: null })
  readAt?: Date | null;

  @Prop({ type: Boolean, default: false })
  isArchived: boolean;

  @Prop({ type: Date, required: false, default: null })
  archivedAt?: Date | null;

  /** Reference to the template that rendered this notification, if any. */
  @Prop({ type: Types.ObjectId, ref: 'NotificationTemplate', required: false })
  templateId?: Types.ObjectId;

  /** The actor that triggered this notification (system if absent). */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  actorId?: Types.ObjectId;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ tenantId: 1, recipient: 1, isRead: 1, isArchived: 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, recipient: 1, priority: 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, type: 1 });
NotificationSchema.index({ tenantId: 1, status: 1 });
