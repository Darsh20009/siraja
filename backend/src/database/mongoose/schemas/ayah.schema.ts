import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';

/**
 * Collection: ayahs
 *
 * Platform-global reference data (6,236 documents total, seeded once).
 * `arabicTextNormalized` is a diacritic-stripped ("tashkeel"-removed)
 * copy of `arabicText`, maintained at write time by the seeder/service
 * layer (never derived on read) — MongoDB text indexes tokenize on
 * whitespace and do not understand Arabic diacritics, so searching the
 * raw `arabicText` would miss any query typed without full diacritics
 * (the overwhelming majority of real user input). See
 * `docs/architecture/11-quran-blueprint.md` §Search Architecture.
 */
@Schema({ timestamps: true, collection: 'ayahs' })
export class Ayah extends BaseGlobalSchema {
  @Prop({ type: Number, required: true, unique: true, min: 1, max: 6236 })
  globalAyahNumber: number;

  @Prop({ type: Number, required: true, min: 1, max: 114 })
  surahNumber: number;

  @Prop({ type: Number, required: true, min: 1 })
  ayahNumber: number;

  @Prop({ type: Number, required: true, min: 1, max: 604 })
  pageNumber: number;

  @Prop({ type: Number, required: true, min: 1, max: 30 })
  juzNumber: number;

  @Prop({ type: Number, required: true, min: 1, max: 60 })
  hizbNumber: number;

  @Prop({ type: String, required: true })
  arabicText: string;

  @Prop({ type: String, required: true, index: true })
  arabicTextNormalized: string;
}

export type AyahDocument = HydratedDocument<Ayah>;
export const AyahSchema = SchemaFactory.createForClass(Ayah);

AyahSchema.index({ surahNumber: 1, ayahNumber: 1 }, { unique: true });
AyahSchema.index({ globalAyahNumber: 1 }, { unique: true });
AyahSchema.index({ pageNumber: 1 });
AyahSchema.index({ juzNumber: 1 });
AyahSchema.index({ hizbNumber: 1 });
AyahSchema.index({ arabicTextNormalized: 'text' }, { default_language: 'none' });
