import { Prop, Schema } from '@nestjs/mongoose';

/**
 * Shared Mongoose fields for platform-global (non-tenant-scoped) collections
 * — catalogs and platform-wide records that are not owned by any single
 * tenant (e.g. `tenants` itself, `permissions`, `plans`, `badges`,
 * `system_settings`).
 *
 * Tenant-owned collections use `base.schema.ts` (`BaseSchema`) instead,
 * which additionally requires `tenantId`.
 */
@Schema({ timestamps: true })
export class BaseGlobalSchema {
  @Prop({ type: Boolean, default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  /**
   * TypeScript-only declarations — Mongoose manages these via `timestamps: true`.
   * Declared here so subclasses don't need `(doc as any).createdAt`.
   */
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
