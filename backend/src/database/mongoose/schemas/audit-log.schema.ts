import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { AuditAction, ActorType, AuditEntityType } from '@shared/enums/audit.enum';
import { BaseGlobalSchema } from './base-global.schema';

export type AuditLogDocument = HydratedDocument<AuditLog>;

/**
 * Collection: audit_logs
 *
 * Shared, append-only security + admin action trail.
 * Used by:
 *  - AuthAuditService  (Phase 4) — login, password, device events
 *  - AdminAuditService (Phase 12E) — admin CRUD, tenant/permission changes
 *
 * Both services write to the same collection, distinguished by `action`.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' })
export class AuditLog extends BaseGlobalSchema {
  /** The user (or system) that performed the action. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  actor?: Types.ObjectId;

  @Prop({ type: String, enum: ActorType, default: ActorType.USER })
  actorType: ActorType;

  @Prop()
  actorName?: string;

  @Prop({ required: false })
  tenantId?: string;

  @Prop({ type: String, enum: AuditAction, required: true })
  action: AuditAction;

  /** e.g. 'User', 'Tenant', 'Role', 'Donation' */
  @Prop({ required: true })
  entityType: string;

  @Prop({ required: true })
  entityId: string;

  @Prop()
  entityName?: string;

  /** JSON diff — only the fields that changed { field: { from, to } } */
  @Prop({ type: Object })
  changes?: Record<string, unknown>;

  /** Extended diff for Phase 12E admin events */
  @Prop({ type: Object })
  diff?: Record<string, { from: unknown; to: unknown }>;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  endpoint?: string;

  @Prop()
  notes?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
