import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { TokenPurpose } from '@shared/enums/token-purpose.enum';

/**
 * Collection: verification_tokens
 *
 * Single-use, time-limited email tokens for both verification flows this
 * phase supports — email address verification and password reset. One
 * collection, distinguished by `purpose`, because both are structurally
 * identical ("prove control of this inbox") and gain nothing from being
 * split; `TokenPurpose` keeps them from ever being redeemed for the
 * wrong flow.
 *
 * Only `tokenHash` (SHA-256 of the raw token mailed to the user) is
 * stored — never the raw token — for the same reason as
 * `RefreshToken.tokenHash`.
 */
@Schema({ timestamps: true, collection: 'verification_tokens' })
export class VerificationToken extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: TokenPurpose, required: true })
  purpose: TokenPurpose;

  @Prop({ type: String, required: true, select: false })
  tokenHash: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true })
  email: string; // snapshot of the address the token was sent to

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, required: false, default: null })
  consumedAt?: Date | null;

  @Prop({ type: String, required: false })
  requestIpAddress?: string;
}

export type VerificationTokenDocument = HydratedDocument<VerificationToken>;
export const VerificationTokenSchema = SchemaFactory.createForClass(VerificationToken);

VerificationTokenSchema.index({ tenantId: 1, userId: 1, purpose: 1 });
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
