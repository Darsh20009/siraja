import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseSchema } from './base.schema';
import { Role as PlatformRole } from '@shared/enums/roles.enum';
import { AuthProvider } from '@shared/enums/auth-provider.enum';
import { Gender } from '@shared/enums/gender.enum';
import { UserStatus } from '@shared/enums/user-status.enum';

/**
 * Embedded value object — one linked external auth provider per user
 * (e.g. Google/Apple subject id). Embedded because it is small,
 * bounded, and always read/written together with the user.
 */
@Schema({ _id: false })
export class LinkedAuthProvider {
  @Prop({ type: String, enum: AuthProvider, required: true })
  provider: AuthProvider;

  @Prop({ type: String, required: true })
  providerUserId: string;

  @Prop({ type: Date, required: true, default: () => new Date() })
  linkedAt: Date;
}
export const LinkedAuthProviderSchema = SchemaFactory.createForClass(LinkedAuthProvider);

/**
 * Collection: users
 *
 * Shared identity for every human actor in a tenant (tenant admin,
 * supervisor, sheikh, parent, student, or a tenant-less super admin).
 * Role-specific profile data (student grade, sheikh qualifications, ...)
 * lives in `students` / `parents` / `sheikhs` / `supervisors`, each
 * referencing a `User` by ObjectId — kept separate from `users` because
 * those profiles have very different shapes and growth patterns.
 *
 * `SUPER_ADMIN` users are platform-level: `tenantId` is still required by
 * the shared base schema for indexing consistency, but super admins are
 * provisioned against a reserved platform tenant document rather than a
 * real academy/circle tenant.
 */
@Schema({ timestamps: true, collection: 'users' })
export class User extends BaseSchema {
  @Prop({ type: String, required: false, trim: true, lowercase: true })
  email?: string;

  @Prop({ type: String, required: false, trim: true })
  phone?: string;

  @Prop({ type: String, required: false, select: false })
  passwordHash?: string;

  @Prop({ type: String, required: true, trim: true })
  fullName: string;

  @Prop({ type: String, required: false, trim: true })
  avatarUrl?: string;

  @Prop({ type: String, enum: Gender, required: false })
  gender?: Gender;

  // A user may hold more than one role in a tenant (e.g. a Sheikh who is
  // also a Supervisor) — `roles` is always non-empty; the RBAC layer
  // (Phase 3) unions permissions/ownership across every role in the
  // array rather than assuming a single primary role.
  @Prop({ type: [String], enum: PlatformRole, required: true, validate: [(v: string[]) => v.length > 0, 'roles must not be empty'] })
  roles: PlatformRole[];

  @Prop({ type: String, enum: UserStatus, required: true, default: UserStatus.PENDING_VERIFICATION })
  status: UserStatus;

  @Prop({ type: Boolean, default: false })
  isEmailVerified: boolean;

  @Prop({ type: Boolean, default: false })
  isPhoneVerified: boolean;

  @Prop({ type: [LinkedAuthProviderSchema], default: [] })
  linkedProviders: LinkedAuthProvider[];

  @Prop({ type: String, required: false, default: 'ar' })
  preferredLocale?: string;

  @Prop({ type: Date, required: false, default: null })
  lastLoginAt?: Date | null;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

// A person's login identity is unique per tenant membership (the same
// human could have separate accounts in two different tenants).
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true, sparse: true });
UserSchema.index({ tenantId: 1, phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ tenantId: 1, roles: 1 });
UserSchema.index({ tenantId: 1, status: 1 });
UserSchema.index({ tenantId: 1, 'linkedProviders.provider': 1, 'linkedProviders.providerUserId': 1 });
UserSchema.index({ tenantId: 1, isDeleted: 1, createdAt: -1 });
