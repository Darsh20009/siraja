import { Types } from 'mongoose';
import { RefreshTokenDocument } from '@database/mongoose/schemas';

export interface CreateRefreshTokenInput {
  tenantId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  deviceId: Types.ObjectId | string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Session Module contract. A `RefreshToken` document IS a session — see
 * the schema doc for why one collection serves both concerns (rotation
 * bookkeeping + "active sessions" listing).
 */
export interface IRefreshTokenRepository {
  create(input: CreateRefreshTokenInput): Promise<RefreshTokenDocument>;
  findActiveByHash(tokenHash: string): Promise<RefreshTokenDocument | null>;
  revokeById(id: Types.ObjectId | string, reason: string, replacedByTokenId?: Types.ObjectId | string): Promise<void>;
  revokeAllForUser(userId: Types.ObjectId | string, reason: string): Promise<void>;
  revokeAllForDevice(deviceId: Types.ObjectId | string, reason: string): Promise<void>;
  revokeFamily(familyId: string, reason: string): Promise<void>;
  listActiveForUser(userId: Types.ObjectId | string): Promise<RefreshTokenDocument[]>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
