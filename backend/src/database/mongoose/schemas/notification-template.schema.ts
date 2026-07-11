import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';
import { NotificationChannel, NotificationType } from '@shared/enums/notification.enum';

/**
 * Collection: notification_templates
 *
 * Reusable content templates for notifications.
 * A template can be global (no tenantId) or tenant-specific (tenantId set).
 * Tenant-specific templates override global ones for the same type+channel.
 *
 * Variables are expressed as {{variableName}} and substituted at dispatch
 * time by TemplateRenderService.
 *
 * Phase 10: Communication & Notification Platform.
 */
@Schema({ timestamps: true, collection: 'notification_templates' })
export class NotificationTemplate extends BaseGlobalSchema {
  /** Optional — null means this is a platform-global default template. */
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: false, default: null })
  tenantId?: Types.ObjectId | null;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ type: String, enum: NotificationChannel, required: true })
  channel: NotificationChannel;

  @Prop({ type: String, required: true, trim: true })
  titleTemplate: string;

  @Prop({ type: String, required: true, trim: true })
  bodyTemplate: string;

  /** HTML body for EMAIL channel; ignored for IN_APP. */
  @Prop({ type: String, required: false })
  htmlBodyTemplate?: string;

  /** Variable names expected in this template, e.g. ['studentName', 'date']. */
  @Prop({ type: [String], default: [] })
  variables: string[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;
}

export type NotificationTemplateDocument = HydratedDocument<NotificationTemplate>;
export const NotificationTemplateSchema = SchemaFactory.createForClass(NotificationTemplate);

// Tenant-specific template overrides the global default for the same type+channel.
NotificationTemplateSchema.index({ tenantId: 1, type: 1, channel: 1 });
NotificationTemplateSchema.index({ isActive: 1 });
