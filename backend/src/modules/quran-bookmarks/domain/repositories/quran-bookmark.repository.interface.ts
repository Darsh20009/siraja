import { QuranBookmarkType } from '@shared/enums/quran-bookmark-type.enum';

export interface QuranBookmarkRecord {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  type: QuranBookmarkType;
  label?: string;
  createdAt: Date;
}

export interface QuranLastReadRecord {
  surahNumber: number;
  ayahNumber: number;
  pageNumber: number;
  updatedAt: Date;
}

export interface CreateQuranBookmarkInput {
  tenantId: string;
  userId: string;
  surahNumber: number;
  ayahNumber: number;
  type: QuranBookmarkType;
  label?: string;
}

export interface IQuranBookmarkRepository {
  create(input: CreateQuranBookmarkInput): Promise<QuranBookmarkRecord>;
  findAllForUser(tenantId: string, userId: string, type?: QuranBookmarkType): Promise<QuranBookmarkRecord[]>;
  findOwnedById(tenantId: string, userId: string, bookmarkId: string): Promise<QuranBookmarkRecord | null>;
  delete(tenantId: string, userId: string, bookmarkId: string): Promise<void>;

  upsertLastRead(
    tenantId: string,
    userId: string,
    position: { surahNumber: number; ayahNumber: number; pageNumber: number },
  ): Promise<QuranLastReadRecord>;
  getLastRead(tenantId: string, userId: string): Promise<QuranLastReadRecord | null>;
}

export const QURAN_BOOKMARK_REPOSITORY = Symbol('QURAN_BOOKMARK_REPOSITORY');
