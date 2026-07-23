import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

/**
 * Shared Mongoose schema fields for every tenant-scoped collection.
 * `tenantId` is indexed and required on all collections so tenant
 * isolation is enforced at the persistence layer, not just the app layer.
 *
 * `tenantId` is a `Tenant` ObjectId reference. Every concrete schema that
 * extends this base MUST additionally declare a compound index with
 * `tenantId` as the first key (see each schema file) — Mongo can only use
 * one index efficiently per query, so the single-field index declared here
 * is a floor, not the primary access-pattern index.
 */
@Schema({ timestamps: true })
export class BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

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
