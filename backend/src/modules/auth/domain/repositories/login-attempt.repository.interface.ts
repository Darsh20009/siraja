import { Types } from 'mongoose';

export interface RecordLoginAttemptInput {
  tenantId: Types.ObjectId | string;
  identifier: string;
  userId?: Types.ObjectId | string;
  success: boolean;
  failureReason?: string;
  ipAddress: string;
  userAgent?: string;
}

export interface ILoginAttemptRepository {
  record(input: RecordLoginAttemptInput): Promise<void>;
  countRecentFailures(
    tenantId: Types.ObjectId | string,
    identifier: string,
    sinceMs: number,
  ): Promise<number>;
  countRecentFromIp(tenantId: Types.ObjectId | string, ipAddress: string, sinceMs: number): Promise<number>;
  hasRecentSuccessFrom(
    userId: Types.ObjectId | string,
    ipAddress: string,
    userAgent: string | undefined,
    sinceMs: number,
  ): Promise<boolean>;
}

export const LOGIN_ATTEMPT_REPOSITORY = Symbol('LOGIN_ATTEMPT_REPOSITORY');
