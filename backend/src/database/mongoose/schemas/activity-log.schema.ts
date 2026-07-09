import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';

/**
 * Collection: activity_logs
 *
 * Lightweight, high-volume usage/analytics trail (page views, feature
 * usage) — distinct from `audit_logs`, which is the low-volume,
 * security-relevant record of sensitive actions. `tenantId` is optional
 * for the same reason as `audit_logs`. Expected to be TTL-pruned in
 * production (see database blueprint's scalability notes) since it is
 * telemetry, not a permanent record.
 */
@Schema({ timestamps: true, collection: 'activity_logs' })
export class ActivityLog extends BaseGlobalSchema {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: false, index: true })
  tenantId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  action: string; // free-form event key, e.g. "viewed_dashboard"

  @Prop({ type: String, required: false, trim: true })
  entityType?: string;

  @Prop({ type: Types.ObjectId, required: false })
  entityId?: Types.ObjectId;

  @Prop({ type: Object, required: false, default: {} })
  metadata?: Record<string, unknown>;

  @Prop({ type: String, required: false })
  ipAddress?: string;

  @Prop({ type: String, required: false })
  userAgent?: string;
}

export type ActivityLogDocument = HydratedDocument<ActivityLog>;
export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

ActivityLogSchema.index({ tenantId: 1, createdAt: -1 });
ActivityLogSchema.index({ user: 1, createdAt: -1 });
// TTL index: prune raw activity telemetry after 180 days (adjust at
// implementation time based on real retention/compliance requirements).
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });
