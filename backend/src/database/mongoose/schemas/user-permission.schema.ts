import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: user_permissions
 *
 * Join collection granting/revoking individual permission overrides to a
 * specific user, on top of whatever their assigned `Role` already grants
 * (e.g. give one sheikh an extra "exams.grade" permission without
 * creating a whole new role). `isGranted: false` records an explicit
 * revocation that overrides the role-derived grant.
 */
@Schema({ timestamps: true, collection: 'user_permissions' })
export class UserPermission extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  permissionKey: string; // references Permission.key

  @Prop({ type: Boolean, required: true, default: true })
  isGranted: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  grantedBy?: Types.ObjectId;
}

export type UserPermissionDocument = HydratedDocument<UserPermission>;
export const UserPermissionSchema = SchemaFactory.createForClass(UserPermission);

UserPermissionSchema.index({ tenantId: 1, user: 1, permissionKey: 1 }, { unique: true });
UserPermissionSchema.index({ tenantId: 1, permissionKey: 1 });
