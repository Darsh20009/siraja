import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';
import { ActorType, AuditAction } from '@shared/enums/audit.enum';

/**
 * Collection: audit_logs
 *
 * Security/compliance trail of sensitive actions (permission changes,
 * deletions, logins). `tenantId` is optional (sparse) rather than
 * required: a `SUPER_ADMIN` action such as suspending a tenant or editing
 * `system_settings` is platform-level and has no owning tenant, so this
 * collection extends the global base rather than the tenant base.
 * Append-only by convention — never updated or deleted, only inserted.
 */
@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog extends BaseGlobalSchema {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: false, index: true })
  tenantId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  actor?: Types.ObjectId;

  @Prop({ type: String, enum: ActorType, required: true, default: ActorType.USER })
  actorType: ActorType;

  @Prop({ type: String, enum: AuditAction, required: true })
  action: AuditAction;

  @Prop({ type: String, required: true, trim: true })
  entityType: string; // e.g. "Student", "Role"

  @Prop({ type: Types.ObjectId, required: false })
  entityId?: Types.ObjectId;

  @Prop({ type: Object, required: false, default: {} })
  changes?: Record<string, unknown>; // before/after diff

  @Prop({ type: String, required: false })
  ipAddress?: string;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
