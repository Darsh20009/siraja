import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { DevicePlatform } from '@shared/enums/notification.enum';

/**
 * Collection: push_subscriptions
 *
 * One document per registered device/browser push endpoint for a user.
 * Separate from `users` (rather than embedded) because a user may have
 * several devices and subscriptions churn independently (token refresh,
 * uninstall) without touching the user document.
 */
@Schema({ timestamps: true, collection: 'push_subscriptions' })
export class PushSubscription extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: DevicePlatform, required: true })
  platform: DevicePlatform;

  @Prop({ type: String, required: true })
  token: string; // FCM/APNs token or web push endpoint

  @Prop({ type: String, required: false, trim: true })
  deviceLabel?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, required: false, default: null })
  lastSeenAt?: Date | null;
}

export type PushSubscriptionDocument = HydratedDocument<PushSubscription>;
export const PushSubscriptionSchema = SchemaFactory.createForClass(PushSubscription);

PushSubscriptionSchema.index({ tenantId: 1, user: 1, isActive: 1 });
PushSubscriptionSchema.index({ token: 1 }, { unique: true });
