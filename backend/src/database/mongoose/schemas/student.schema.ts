import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { MemorizationStatus } from '@shared/enums/memorization.enum';

/**
 * Collection: students
 *
 * Role-specific profile for a `User` with role STUDENT. One document per
 * enrolled student per tenant, 1:1 with a `User` document.
 */
@Schema({ timestamps: true, collection: 'students' })
export class Student extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: false, default: null })
  group?: Types.ObjectId | null;

  /**
   * Direct one-on-one sheikh assignment — set when a student is taught
   * privately by a sheikh outside of a circle, or in addition to their
   * circle membership. Distinct from the implicit sheikh link via
   * `Student.group → Group.sheikh` (which covers the common in-circle case).
   */
  @Prop({ type: Types.ObjectId, ref: 'Sheikh', required: false, default: null })
  sheikh?: Types.ObjectId | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  parents: Types.ObjectId[]; // Users with role PARENT

  @Prop({ type: Date, required: false })
  dateOfBirth?: Date;

  @Prop({ type: Date, required: true, default: () => new Date() })
  enrolledAt: Date;

  @Prop({ type: String, enum: MemorizationStatus, required: false, default: MemorizationStatus.IN_PROGRESS })
  currentMemorizationStatus?: MemorizationStatus;

  @Prop({ type: Number, required: false, default: 0, min: 0, max: 30 })
  currentJuzNumber?: number; // 0-30, current position in the Quran

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;
}

export type StudentDocument = HydratedDocument<Student>;
export const StudentSchema = SchemaFactory.createForClass(Student);

StudentSchema.index({ tenantId: 1, user: 1 }, { unique: true });
StudentSchema.index({ tenantId: 1, group: 1 });
StudentSchema.index({ tenantId: 1, parents: 1 });
StudentSchema.index({ tenantId: 1, isActive: 1, isDeleted: 1 });
