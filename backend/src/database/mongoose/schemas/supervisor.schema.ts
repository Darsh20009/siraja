import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: supervisors
 *
 * Role-specific profile for a `User` with role SUPERVISOR — oversees a
 * set of groups/sheikhs within a tenant (below Tenant Admin, above Sheikh
 * in the org hierarchy).
 */
@Schema({ timestamps: true, collection: 'supervisors' })
export class Supervisor extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Group' }], default: [] })
  supervisedGroups: Types.ObjectId[];

  @Prop({ type: String, required: false, trim: true })
  department?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export type SupervisorDocument = HydratedDocument<Supervisor>;
export const SupervisorSchema = SchemaFactory.createForClass(Supervisor);

SupervisorSchema.index({ tenantId: 1, user: 1 }, { unique: true });
SupervisorSchema.index({ tenantId: 1, supervisedGroups: 1 });
