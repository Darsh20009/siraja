import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: login_attempts
 *
 * Append-only log of every login attempt (success and failure), scoped
 * per tenant since the same email/phone can exist as separate accounts
 * in different tenants. Backs three distinct security features off one
 * source of truth:
 *
 * 1. **Brute-force / account lockout** — count recent
 *    `success: false` rows for a given `(tenantId, identifier)` within a
 *    sliding window; lock the account after the configured threshold.
 * 2. **Rate limiting** — count recent rows for a given `ipAddress`
 *    regardless of which account was targeted (credential-stuffing
 *    across many emails from one IP).
 * 3. **Suspicious login detection** — compare a new *successful*
 *    attempt's `ipAddress`/`userAgent`/coarse location against the
 *    user's recent history; a mismatch triggers a
 *    `SUSPICIOUS_LOGIN` audit event and (future) an email alert.
 *
 * TTL-pruned; this is a rolling security signal, not a permanent record
 * (permanent, human-auditable events are written to `audit_logs`
 * instead).
 */
@Schema({ timestamps: true, collection: 'login_attempts' })
export class LoginAttempt extends BaseSchema {
  @Prop({ type: String, required: true, trim: true, lowercase: true })
  identifier: string; // email or phone as submitted

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId; // set only if the identifier resolved to a real account

  @Prop({ type: Boolean, required: true })
  success: boolean;

  @Prop({ type: String, required: false })
  failureReason?: string; // 'invalid_credentials' | 'account_locked' | 'unverified_email' | 'account_suspended'

  @Prop({ type: String, required: true })
  ipAddress: string;

  @Prop({ type: String, required: false })
  userAgent?: string;
}

export type LoginAttemptDocument = HydratedDocument<LoginAttempt>;
export const LoginAttemptSchema = SchemaFactory.createForClass(LoginAttempt);

LoginAttemptSchema.index({ tenantId: 1, identifier: 1, createdAt: -1 });
LoginAttemptSchema.index({ tenantId: 1, ipAddress: 1, createdAt: -1 });
LoginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
