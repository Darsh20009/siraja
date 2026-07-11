import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: tenant_settings
 *
 * 1:1 with `tenants` (kept as its own collection rather than embedded so
 * settings can grow independently without rewriting the tenant document).
 * Free-form `features`/`preferences` maps hold tenant-configurable toggles
 * without requiring a schema migration per new setting.
 */
@Schema({ timestamps: true, collection: 'tenant_settings' })
export class TenantSettings extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, unique: true })
  tenant: Types.ObjectId;

  @Prop({ type: String, required: false, default: 'ar' })
  primaryLocale?: string;

  @Prop({ type: [String], default: ['ar', 'en'] })
  supportedLocales: string[];

  @Prop({ type: Map, of: Boolean, default: {} })
  features: Map<string, boolean>;

  @Prop({ type: Map, of: String, default: {} })
  preferences: Map<string, string>;

  @Prop({ type: String, required: false })
  brandPrimaryColor?: string;

  @Prop({ type: Boolean, default: true })
  attendanceNotificationsEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  parentPortalEnabled: boolean;
}

export type TenantSettingsDocument = HydratedDocument<TenantSettings>;
export const TenantSettingsSchema = SchemaFactory.createForClass(TenantSettings);

// `tenant` is already uniquely indexed via `unique: true` on the @Prop
// above, which enforces the intended one-settings-document-per-tenant
// invariant (every document's `tenant` must equal its `tenantId`). The
// inherited `tenantId` field from BaseSchema already has its own
// (non-unique) index, so no separate `{ tenantId: 1 }` index is declared
// here to avoid duplicating it.
