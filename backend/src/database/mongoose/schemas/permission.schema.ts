import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';

/**
 * Collection: permissions
 *
 * Platform-wide permission catalog (NOT tenant-scoped) — a fixed set of
 * capability keys (e.g. "students.create", "exams.grade") that roles are
 * built from. Tenants cannot define new permissions, only compose roles
 * from this catalog (see `roles` + `user_permissions`).
 */
@Schema({ timestamps: true, collection: 'permissions' })
export class Permission extends BaseGlobalSchema {
  @Prop({ type: String, required: true, unique: true, trim: true, lowercase: true })
  key: string; // e.g. "students.create", "exams.grade"

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: String, required: true, trim: true })
  module: string; // e.g. "students", "exams", "billing"
}

export type PermissionDocument = HydratedDocument<Permission>;
export const PermissionSchema = SchemaFactory.createForClass(Permission);

// `key` is already uniquely indexed via `unique: true` on the @Prop above.
PermissionSchema.index({ module: 1 });
