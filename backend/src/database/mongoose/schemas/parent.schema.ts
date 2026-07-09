import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: parents
 *
 * Role-specific profile for a `User` with role PARENT. The inverse side of
 * `Student.parents` — kept as a two-way reference (rather than deriving
 * one from the other) so a parent's dashboard can list their children
 * with a single indexed query.
 */
@Schema({ timestamps: true, collection: 'parents' })
export class Parent extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Student' }], default: [] })
  students: Types.ObjectId[];

  @Prop({ type: String, required: false, trim: true })
  relationship?: string; // e.g. "father", "mother", "guardian"

  @Prop({ type: Boolean, default: true })
  receiveProgressReports: boolean;
}

export type ParentDocument = HydratedDocument<Parent>;
export const ParentSchema = SchemaFactory.createForClass(Parent);

ParentSchema.index({ tenantId: 1, user: 1 }, { unique: true });
ParentSchema.index({ tenantId: 1, students: 1 });
