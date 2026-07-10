import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { DevicePlatform } from '@shared/enums/device-platform.enum';

/**
 * Collection: devices
 *
 * One document per physical device/browser a user has ever logged in
 * from — independent of any single login (a device is remembered across
 * many login/refresh cycles, whereas `RefreshToken` documents churn on
 * every rotation). Backs "Active Sessions" / "Device Management" UI and
 * device-level revocation ("log out this device everywhere").
 *
 * `deviceId` is a client-generated, persisted identifier (e.g. stored in
 * secure storage on mobile, a long-lived cookie/localStorage id on web)
 * sent on every login — NOT derived solely from the user agent string,
 * so it survives app updates and is stable enough to recognize a
 * returning device for suspicious-login comparisons.
 */
@Schema({ timestamps: true, collection: 'devices' })
export class Device extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  deviceId: string;

  @Prop({ type: String, required: false, trim: true })
  deviceName?: string; // e.g. "Ahmed's iPhone 15"

  @Prop({ type: String, enum: DevicePlatform, required: true, default: DevicePlatform.UNKNOWN })
  platform: DevicePlatform;

  @Prop({ type: String, required: false })
  appVersion?: string;

  @Prop({ type: String, required: false })
  userAgent?: string;

  @Prop({ type: String, required: false })
  lastIpAddress?: string;

  @Prop({ type: String, required: false })
  lastKnownLocation?: string; // coarse geo (city/country) resolved from IP, best-effort

  @Prop({ type: Boolean, default: true })
  isTrusted: boolean; // flips to false once revoked; a new login re-registers/trusts it again

  @Prop({ type: Date, required: false, default: () => new Date() })
  firstSeenAt: Date;

  @Prop({ type: Date, required: false, default: () => new Date() })
  lastSeenAt: Date;

  @Prop({ type: Date, required: false, default: null })
  revokedAt?: Date | null;

  // --- Future ready (Phase 4 "Future Ready" requirement) ---
  // Not populated by any flow yet; reserved so passkey/biometric
  // enrollment can attach credentials to a device without a schema
  // migration later.
  @Prop({ type: [Object], required: false, default: [] })
  webauthnCredentials?: Record<string, unknown>[];
}

export type DeviceDocument = HydratedDocument<Device>;
export const DeviceSchema = SchemaFactory.createForClass(Device);

DeviceSchema.index({ tenantId: 1, userId: 1, deviceId: 1 }, { unique: true });
DeviceSchema.index({ tenantId: 1, userId: 1, isTrusted: 1 });
DeviceSchema.index({ tenantId: 1, lastSeenAt: -1 });
