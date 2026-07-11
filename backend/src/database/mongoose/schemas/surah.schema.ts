import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseGlobalSchema } from './base-global.schema';
import { RevelationType } from '@shared/enums/revelation-type.enum';

/**
 * Collection: surahs
 *
 * Platform-global reference data (`BaseGlobalSchema`, not tenant-scoped)
 * — the Quran text is identical for every tenant, so it is seeded once
 * and read by everyone. 114 documents, seeded once, effectively
 * read-only after seeding (content-management writes are Super-Admin-only,
 * see `docs/architecture/11-quran-blueprint.md`).
 */
@Schema({ timestamps: true, collection: 'surahs' })
export class Surah extends BaseGlobalSchema {
  @Prop({ type: Number, required: true, unique: true, min: 1, max: 114 })
  surahNumber: number;

  @Prop({ type: String, required: true, trim: true })
  arabicName: string;

  @Prop({ type: String, required: true, trim: true })
  englishName: string;

  @Prop({ type: String, required: true, trim: true })
  englishTranslationName: string;

  @Prop({ type: String, enum: RevelationType, required: true })
  revelationType: RevelationType;

  @Prop({ type: Number, required: true, min: 1 })
  ayahCount: number;

  @Prop({ type: Number, required: false, min: 1, max: 114 })
  revelationOrder?: number;
}

export type SurahDocument = HydratedDocument<Surah>;
export const SurahSchema = SchemaFactory.createForClass(Surah);

// `surahNumber` is already uniquely indexed via `unique: true` on the @Prop above.
SurahSchema.index({ arabicName: 'text', englishName: 'text', englishTranslationName: 'text' });
