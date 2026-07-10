import { Types } from 'mongoose';
import { VerificationTokenDocument } from '@database/mongoose/schemas';
import { TokenPurpose } from '@shared/enums/token-purpose.enum';

export interface CreateVerificationTokenInput {
  tenantId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  purpose: TokenPurpose;
  tokenHash: string;
  email: string;
  expiresAt: Date;
  requestIpAddress?: string;
}

export interface IVerificationTokenRepository {
  create(input: CreateVerificationTokenInput): Promise<VerificationTokenDocument>;
  findActiveByHash(tokenHash: string, purpose: TokenPurpose): Promise<VerificationTokenDocument | null>;
  consume(id: Types.ObjectId | string): Promise<void>;
  invalidateAllForUser(userId: Types.ObjectId | string, purpose: TokenPurpose): Promise<void>;
}

export const VERIFICATION_TOKEN_REPOSITORY = Symbol('VERIFICATION_TOKEN_REPOSITORY');
