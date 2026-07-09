import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: sheikhs
 *
 * Role-specific profile for a `User` with role SHEIKH. `groups` is the
 * inverse of `Group.sheikh` for sheikhs teaching multiple circles.
 */
@Schema({ timestamps: true, collection: 'sheikhs' })
export class Sheikh extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Group' }], default: [] })
  groups: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  qualifications: string[]; // e.g. "Ijazah - Hafs narration"

  @Prop({ type: Number, required: false, min: 0 })
  yearsOfExperience?: number;

  @Prop({ type: String, required: false, trim: true })
  bio?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export type SheikhDocument = HydratedDocument<Sheikh>;
export const SheikhSchema = SchemaFactory.createForClass(Sheikh);

SheikhSchema.index({ tenantId: 1, user: 1 }, { unique: true });
SheikhSchema.index({ tenantId: 1, groups: 1 });
SheikhSchema.index({ tenantId: 1, isActive: 1, isDeleted: 1 });
