import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';
import { TenantStatus, TenantType } from '@shared/enums/tenant-status.enum';

/**
 * Collection: tenants
 *
 * Root of the multi-tenant architecture. NOT tenant-scoped itself — every
 * other tenant-owned collection stores a `tenantId` referencing a document
 * here. `slug` is what resolves the URL path segment
 * (e.g. `siraja.website/tuwaiq` -> slug "tuwaiq").
 */
@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant extends BaseGlobalSchema {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/,
  })
  slug: string;

  @Prop({ type: String, enum: TenantType, required: true })
  type: TenantType;

  @Prop({ type: String, enum: TenantStatus, required: true, default: TenantStatus.TRIAL })
  status: TenantStatus;

  @Prop({ type: String, required: false, trim: true })
  logoUrl?: string;

  @Prop({ type: String, required: false, trim: true })
  contactEmail?: string;

  @Prop({ type: String, required: false, trim: true })
  contactPhone?: string;

  @Prop({ type: String, required: false, default: 'Asia/Riyadh' })
  timezone?: string;

  @Prop({ type: String, required: false, default: 'ar' })
  defaultLocale?: string;

  @Prop({ type: Date, required: false, default: null })
  trialEndsAt?: Date | null;
}

export type TenantDocument = HydratedDocument<Tenant>;
export const TenantSchema = SchemaFactory.createForClass(Tenant);

// Reserved platform slugs (api, admin, auth, ...) are enforced at the
// application layer, not the schema layer — kept here only as documentation.
// `slug` is already uniquely indexed via `unique: true` on the @Prop above.
TenantSchema.index({ status: 1 });
TenantSchema.index({ isDeleted: 1, createdAt: -1 });
