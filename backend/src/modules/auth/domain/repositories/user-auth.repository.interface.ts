import { Types } from 'mongoose';
import { User, UserDocument } from '@database/mongoose/schemas';

/**
 * Auth's own narrow view of `User` persistence — deliberately NOT the
 * full `UsersModule` repository (which will own general CRUD/profile
 * concerns once implemented). Auth only ever needs to find-by-identity
 * and mutate a handful of security fields, so it depends on this small
 * interface instead of reaching into another bounded context's
 * internals — keeps the auth domain layer framework- and
 * module-agnostic per the Clean Architecture requirement.
 *
 * `create` and `updateById` accept `Partial<User>` (the schema class, not
 * the HydratedDocument) so callers can pass plain data objects without
 * needing to assign Mongoose document methods — the implementation casts
 * internally as needed.
 */
export interface IUserAuthRepository {
  findByEmail(tenantId: Types.ObjectId | string, email: string): Promise<UserDocument | null>;
  findByPhone(tenantId: Types.ObjectId | string, phone: string): Promise<UserDocument | null>;
  findById(id: Types.ObjectId | string): Promise<UserDocument | null>;
  findByLinkedProvider(
    tenantId: Types.ObjectId | string,
    provider: string,
    providerUserId: string,
  ): Promise<UserDocument | null>;
  create(data: Partial<User>): Promise<UserDocument>;
  updateById(id: Types.ObjectId | string, update: Partial<User>): Promise<UserDocument | null>;
}

export const USER_AUTH_REPOSITORY = Symbol('USER_AUTH_REPOSITORY');
