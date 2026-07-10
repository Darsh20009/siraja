import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: refresh_tokens
 *
 * One document per issued refresh token = one active "session" for
 * multi-device support. Never stores the raw token — only a SHA-256
 * `tokenHash`, so a database read alone can never yield a usable
 * credential (mirrors how `User.passwordHash` is never the plaintext).
 *
 * Refresh Token Rotation: on every `/auth/refresh`, the presented token
 * is looked up by hash, checked for `revokedAt`/`expiresAt`, then
 * immediately revoked and replaced by a new document that links back via
 * `replacedByTokenId`. If a token whose `revokedAt` is already set is
 * ever presented again, that is definitive evidence the token was
 * stolen and reused (`TOKEN_REUSE_DETECTED`) — the entire chain
 * (walk back via `replacedByTokenId`, or simply revoke every token
 * sharing `deviceId`) is force-revoked as a precaution.
 *
 * Doubles as the "Active Sessions" list: a document with
 * `revokedAt: null` and `expiresAt > now` IS an active session by
 * definition, keyed to a `Device` for the human-readable device/location
 * info shown to the user.
 */
@Schema({ timestamps: true, collection: 'refresh_tokens' })
export class RefreshToken extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Device', required: true, index: true })
  deviceId: Types.ObjectId;

  @Prop({ type: String, required: true, select: false })
  tokenHash: string; // sha256(raw refresh token)

  @Prop({ type: String, required: false, index: true })
  familyId?: string; // stable across rotations of the same session chain

  @Prop({ type: Types.ObjectId, ref: 'RefreshToken', required: false, default: null })
  replacedByTokenId?: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, required: false, default: null })
  revokedAt?: Date | null;

  @Prop({ type: String, required: false })
  revokedReason?: string; // 'rotated' | 'logout' | 'logout_all' | 'device_revoked' | 'reuse_detected' | 'password_changed'

  @Prop({ type: String, required: false })
  ipAddress?: string;

  @Prop({ type: String, required: false })
  userAgent?: string;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

RefreshTokenSchema.index({ tenantId: 1, userId: 1, revokedAt: 1 });
RefreshTokenSchema.index({ tenantId: 1, deviceId: 1 });
RefreshTokenSchema.index({ familyId: 1 });
// TTL cleanup: Mongo purges the document itself once expired, independent
// of application-level revocation bookkeeping above.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
