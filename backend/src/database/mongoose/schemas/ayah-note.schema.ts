import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: ayah_notes
 *
 * Teacher/supervisor/admin-authored notes attached to one student's one
 * ayah — deliberately a separate collection from `quran_notes` (Phase 5),
 * which are private, self-owned notes a user writes for themselves.
 * `ayah_notes` are always authored BY a staff member ABOUT a student and
 * are visible to that student and their linked parent(s), matching the
 * Smart Mushaf "teacher notes on ayahs" requirement.
 */
@Schema({ timestamps: true, collection: 'ayah_notes' })
export class AyahNote extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 114 })
  surahNumber: number;

  @Prop({ type: Number, required: true, min: 1 })
  ayahNumber: number;

  @Prop({ type: String, required: true, trim: true, maxlength: 2000 })
  text: string;
}

export type AyahNoteDocument = HydratedDocument<AyahNote>;
export const AyahNoteSchema = SchemaFactory.createForClass(AyahNote);

AyahNoteSchema.index({ tenantId: 1, student: 1, surahNumber: 1, ayahNumber: 1 });
AyahNoteSchema.index({ tenantId: 1, author: 1, createdAt: -1 });
