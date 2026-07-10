import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';
import { TafsirSource } from '@shared/enums/tafsir-source.enum';

/**
 * Collection: tafsirs
 *
 * Platform-global reference data — one document per
 * (surahNumber, ayahNumber, source) triple. Kept as its own collection
 * (not embedded in `Ayah`) because an Ayah can have many Tafsir entries
 * across sources/languages and Tafsir text is large relative to Ayah text.
 */
@Schema({ timestamps: true, collection: 'tafsirs' })
export class Tafsir extends BaseGlobalSchema {
  @Prop({ type: Number, required: true, min: 1, max: 114 })
  surahNumber: number;

  @Prop({ type: Number, required: true, min: 1 })
  ayahNumber: number;

  @Prop({ type: String, enum: TafsirSource, required: true })
  source: TafsirSource;

  @Prop({ type: String, required: true, default: 'ar' })
  language: string;

  @Prop({ type: String, required: true })
  text: string;
}

export type TafsirDocument = HydratedDocument<Tafsir>;
export const TafsirSchema = SchemaFactory.createForClass(Tafsir);

TafsirSchema.index({ surahNumber: 1, ayahNumber: 1, source: 1, language: 1 }, { unique: true });
TafsirSchema.index({ source: 1 });
