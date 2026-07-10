import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';

/**
 * Collection: quran_last_reads
 *
 * Exactly one document per user (enforced by the unique index below) —
 * auto-tracked "resume where I left off" position, upserted every time
 * the user opens an Ayah, not a user-curated list like `QuranBookmark`.
 */
@Schema({ timestamps: true, collection: 'quran_last_reads' })
export class QuranLastRead extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 114 })
  surahNumber: number;

  @Prop({ type: Number, required: true, min: 1 })
  ayahNumber: number;

  @Prop({ type: Number, required: true, min: 1, max: 604 })
  pageNumber: number;
}

export type QuranLastReadDocument = HydratedDocument<QuranLastRead>;
export const QuranLastReadSchema = SchemaFactory.createForClass(QuranLastRead);

QuranLastReadSchema.index({ tenantId: 1, user: 1 }, { unique: true });
