import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { QuranNoteScope } from '@shared/enums/quran-note-scope.enum';

/**
 * Collection: quran_notes
 *
 * Tenant + user scoped. Personal notes are private to the author —
 * there is no sharing/visibility field by design (a future "share note
 * with my sheikh" feature would be additive, not a breaking change).
 */
@Schema({ timestamps: true, collection: 'quran_notes' })
export class QuranNote extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: QuranNoteScope, required: true })
  scope: QuranNoteScope;

  @Prop({ type: Number, required: true, min: 1, max: 114 })
  surahNumber: number;

  @Prop({ type: Number, required: false, min: 1 })
  ayahNumber?: number;

  @Prop({ type: String, required: true, trim: true, maxlength: 5000 })
  text: string;
}

export type QuranNoteDocument = HydratedDocument<QuranNote>;
export const QuranNoteSchema = SchemaFactory.createForClass(QuranNote);

QuranNoteSchema.index({ tenantId: 1, user: 1, surahNumber: 1, ayahNumber: 1 });
QuranNoteSchema.index({ tenantId: 1, user: 1, scope: 1, createdAt: -1 });
