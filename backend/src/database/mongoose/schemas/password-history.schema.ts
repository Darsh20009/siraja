import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: password_histories
 *
 * Append-only record of a user's previous password hashes (Argon2), kept
 * separate from `User.passwordHash` so "don't allow reusing your last N
 * passwords" can be enforced without ever inflating the hot `users`
 * document with an unbounded array. Application layer keeps only the
 * most recent N (config-driven) per user and prunes older entries.
 */
@Schema({ timestamps: true, collection: 'password_histories' })
export class PasswordHistory extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, select: false })
  passwordHash: string;
}

export type PasswordHistoryDocument = HydratedDocument<PasswordHistory>;
export const PasswordHistorySchema = SchemaFactory.createForClass(PasswordHistory);

PasswordHistorySchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
