import { Types } from 'mongoose';
import { UserDocument } from '@database/mongoose/schemas';

export interface UpdateUserFields {
  fullName?: string;
  avatarUrl?: string;
  gender?: string;
  preferredLocale?: string;
}

export interface IUserRepository {
  findById(tenantId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<UserDocument | null>;
  update(tenantId: string | Types.ObjectId, userId: string | Types.ObjectId, fields: UpdateUserFields): Promise<UserDocument | null>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
