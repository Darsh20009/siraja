import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseSchema } from './base.schema';
import { QuranBookmarkType } from '@shared/enums/quran-bookmark-type.enum';

/**
 * Collection: quran_bookmarks
 *
 * Tenant + user scoped (`BaseSchema`) — unlike Surah/Ayah/Tafsir, this is
 * user-curated data, not shared reference content. Covers both "User
 * Bookmarks" and "Favorite Ayahs" (`type` distinguishes them); "Last Read
 * Position" is intentionally NOT here — see `QuranLastRead`.
 */
@Schema({ timestamps: true, collection: 'quran_bookmarks' })
export class QuranBookmark extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 114 })
  surahNumber: number;

  @Prop({ type: Number, required: true, min: 1 })
  ayahNumber: number;

  @Prop({ type: String, enum: QuranBookmarkType, required: true, default: QuranBookmarkType.BOOKMARK })
  type: QuranBookmarkType;

  @Prop({ type: String, required: false, trim: true, maxlength: 100 })
  label?: string;
}

export type QuranBookmarkDocument = HydratedDocument<QuranBookmark>;
export const QuranBookmarkSchema = SchemaFactory.createForClass(QuranBookmark);

QuranBookmarkSchema.index({ tenantId: 1, user: 1, type: 1, createdAt: -1 });
QuranBookmarkSchema.index(
  { tenantId: 1, user: 1, surahNumber: 1, ayahNumber: 1, type: 1 },
  { unique: true },
);
