import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';

/**
 * Collection: quran_pages
 *
 * Quran Metadata Module — one document per Mushaf page (604 documents,
 * standard Madani Mushaf pagination, seeded once). Lets the frontend
 * jump straight to "page 12" without scanning the `ayahs` collection.
 */
@Schema({ timestamps: true, collection: 'quran_pages' })
export class QuranPage extends BaseGlobalSchema {
  @Prop({ type: Number, required: true, unique: true, min: 1, max: 604 })
  pageNumber: number;

  @Prop({ type: Number, required: true, min: 1, max: 114 })
  startSurahNumber: number;

  @Prop({ type: Number, required: true, min: 1 })
  startAyahNumber: number;

  @Prop({ type: Number, required: true, min: 1, max: 30 })
  juzNumber: number;
}

export type QuranPageDocument = HydratedDocument<QuranPage>;
export const QuranPageSchema = SchemaFactory.createForClass(QuranPage);

QuranPageSchema.index({ pageNumber: 1 }, { unique: true });
QuranPageSchema.index({ juzNumber: 1 });
