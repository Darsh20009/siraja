import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';

/**
 * Collection: juzs
 *
 * Quran Metadata Module — navigation reference table (30 documents,
 * seeded once). Boundaries are expressed as `(surahNumber, ayahNumber)`
 * pairs rather than global ayah numbers so callers never need to join
 * against `ayahs` just to render a Juz picker.
 */
@Schema({ timestamps: true, collection: 'juzs' })
export class Juz extends BaseGlobalSchema {
  @Prop({ type: Number, required: true, unique: true, min: 1, max: 30 })
  juzNumber: number;

  @Prop({ type: Number, required: true, min: 1, max: 114 })
  startSurahNumber: number;

  @Prop({ type: Number, required: true, min: 1 })
  startAyahNumber: number;

  @Prop({ type: Number, required: true, min: 1, max: 114 })
  endSurahNumber: number;

  @Prop({ type: Number, required: true, min: 1 })
  endAyahNumber: number;
}

export type JuzDocument = HydratedDocument<Juz>;
export const JuzSchema = SchemaFactory.createForClass(Juz);

JuzSchema.index({ juzNumber: 1 }, { unique: true });
