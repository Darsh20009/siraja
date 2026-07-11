import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { NotificationChannel, NotificationType } from '@shared/enums/notification.enum';

/**
 * Collection: user_preferences
 *
 * Per-user preferences for notification delivery, email, and announcements.
 * One document per user (upserted on first access).
 *
 * Channel preferences: which channels to receive notifications on.
 * Type preferences: which notification types are enabled.
 * Announcement preferences: scopes the user wants to receive.
 *
 * Phase 10: Communication & Notification Platform.
 */
@Schema({ timestamps: true, collection: 'user_preferences' })
export class UserPreferences extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  /** Channels the user has globally enabled. */
  @Prop({ type: [String], enum: NotificationChannel, default: [NotificationChannel.IN_APP] })
  enabledChannels: NotificationChannel[];

  /**
   * Notification types the user has muted.
   * Empty array = receive all types.
   */
  @Prop({ type: [String], enum: NotificationType, default: [] })
  mutedTypes: NotificationType[];

  /** Email notification preferences. */
  @Prop({
    type: {
      enabled: { type: Boolean, default: true },
      dailyDigest: { type: Boolean, default: false },
      digestHour: { type: Number, default: 8 }, // 0-23 UTC
    },
    default: () => ({ enabled: true, dailyDigest: false, digestHour: 8 }),
  })
  email: {
    enabled: boolean;
    dailyDigest: boolean;
    digestHour: number;
  };

  /** Announcement preferences. */
  @Prop({
    type: {
      receiveGlobal: { type: Boolean, default: true },
      receiveTenant: { type: Boolean, default: true },
      receiveCircle: { type: Boolean, default: true },
    },
    default: () => ({ receiveGlobal: true, receiveTenant: true, receiveCircle: true }),
  })
  announcements: {
    receiveGlobal: boolean;
    receiveTenant: boolean;
    receiveCircle: boolean;
  };

  /** In-app notification preferences. */
  @Prop({
    type: {
      enabled: { type: Boolean, default: true },
      soundEnabled: { type: Boolean, default: true },
    },
    default: () => ({ enabled: true, soundEnabled: true }),
  })
  inApp: {
    enabled: boolean;
    soundEnabled: boolean;
  };
}

export type UserPreferencesDocument = HydratedDocument<UserPreferences>;
export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferences);

UserPreferencesSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
