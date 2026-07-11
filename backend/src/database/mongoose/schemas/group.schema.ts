import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: groups
 *
 * A Quran circle/halaqah (or academy classroom) within a tenant. `students`
 * is a denormalized convenience array mirroring `Student.group`; the
 * source of truth for membership is `Student.group` — this array is
 * maintained alongside it purely to make "list students in this group"
 * a single-document read for small/medium groups (a few dozen students).
 */
@Schema({ timestamps: true, collection: 'groups' })
export class Group extends BaseSchema {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  sheikh?: Types.ObjectId | null;

  /**
   * Supervisor assigned to oversee this circle. Stored here (in addition to
   * `Supervisor.supervisedGroups`) so `findBySupervisor` is a single indexed
   * query rather than a two-step lookup through the supervisor document.
   */
  @Prop({ type: Types.ObjectId, ref: 'Supervisor', required: false, default: null })
  supervisor?: Types.ObjectId | null;

  /**
   * Maximum number of students this circle can accommodate.
   */
  @Prop({ type: Number, required: false, min: 1 })
  capacity?: number;

  /**
   * Short human-readable description of the circle's focus or curriculum.
   */
  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Student' }], default: [] })
  students: Types.ObjectId[];

  @Prop({ type: Number, required: false, default: 0, min: 0, max: 30 })
  targetJuzStart?: number;

  @Prop({ type: Number, required: false, default: 30, min: 0, max: 30 })
  targetJuzEnd?: number;

  @Prop({ type: String, required: false, trim: true })
  schedule?: string; // free-form description (e.g. "Sun/Tue/Thu 4-6pm")

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export type GroupDocument = HydratedDocument<Group>;
export const GroupSchema = SchemaFactory.createForClass(Group);

GroupSchema.index({ tenantId: 1, name: 1 });
GroupSchema.index({ tenantId: 1, sheikh: 1 });
GroupSchema.index({ tenantId: 1, supervisor: 1 });
GroupSchema.index({ tenantId: 1, isActive: 1, isDeleted: 1 });
