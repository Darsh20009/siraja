import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: role
 *
 * Tenant-scoped, named bundles of permission keys (from the global
 * `permissions` catalog). Every tenant is seeded with default roles
 * matching the platform role enum, but tenant admins may compose
 * additional custom roles from the same permission catalog.
 */
@Schema({ timestamps: true, collection: 'roles' })
export class Role extends BaseSchema {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  permissionKeys: string[]; // references Permission.key

  @Prop({ type: Boolean, default: false })
  isSystemRole: boolean; // seeded default (e.g. "sheikh"), not tenant-editable
}

export type RoleDocument = HydratedDocument<Role>;
export const RoleSchema = SchemaFactory.createForClass(Role);

RoleSchema.index({ tenantId: 1, name: 1 }, { unique: true });
RoleSchema.index({ tenantId: 1, isSystemRole: 1 });
