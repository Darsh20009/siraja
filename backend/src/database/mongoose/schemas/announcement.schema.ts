import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { AnnouncementScope, AnnouncementStatus } from '@shared/enums/announcement.enum';
import { NotificationPriority } from '@shared/enums/notification.enum';

/**
 * Collection: announcements
 *
 * Broadcast messages posted to all users in a scope:
 *   GLOBAL  → all tenants   (Super Admin only)
 *   TENANT  → entire tenant (Tenant Admin only)
 *   CIRCLE  → one circle    (Sheikh / Supervisor)
 *
 * Phase 10: Communication & Notification Platform.
 */
@Schema({ timestamps: true, collection: 'announcements' })
export class Announcement extends BaseSchema {
  @Prop({ type: String, enum: AnnouncementScope, required: true })
  scope: AnnouncementScope;

  /** Null for GLOBAL announcements; set for TENANT/CIRCLE. */
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: false, default: null })
  scopedTenantId?: Types.ObjectId | null;

  /** Populated for CIRCLE announcements. */
  @Prop({ type: Types.ObjectId, ref: 'Group', required: false })
  circleId?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 5000 })
  body: string;

  /** Optional HTML-rich body (for email delivery). */
  @Prop({ type: String, required: false })
  htmlBody?: string;

  @Prop({ type: String, enum: NotificationPriority, required: true, default: NotificationPriority.NORMAL })
  priority: NotificationPriority;

  @Prop({ type: String, enum: AnnouncementStatus, required: true, default: AnnouncementStatus.DRAFT })
  status: AnnouncementStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, required: false })
  publishedAt?: Date;

  @Prop({ type: Date, required: false })
  expiresAt?: Date;

  /** Deep-link URL surfaced in the in-app notification. */
  @Prop({ type: String, required: false, trim: true })
  deepLink?: string;
}

export type AnnouncementDocument = HydratedDocument<Announcement>;
export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);

AnnouncementSchema.index({ scope: 1, status: 1, publishedAt: -1 });
AnnouncementSchema.index({ tenantId: 1, status: 1, publishedAt: -1 });
AnnouncementSchema.index({ tenantId: 1, circleId: 1, status: 1 });
AnnouncementSchema.index({ tenantId: 1, createdBy: 1 });
