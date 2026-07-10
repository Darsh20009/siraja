import { QuranNoteScope } from '@shared/enums/quran-note-scope.enum';

export interface QuranNoteRecord {
  id: string;
  scope: QuranNoteScope;
  surahNumber: number;
  ayahNumber?: number;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuranNoteInput {
  tenantId: string;
  userId: string;
  scope: QuranNoteScope;
  surahNumber: number;
  ayahNumber?: number;
  text: string;
}

export interface UpdateQuranNoteInput {
  text: string;
}

export interface IQuranNoteRepository {
  create(input: CreateQuranNoteInput): Promise<QuranNoteRecord>;
  findAllForUser(tenantId: string, userId: string): Promise<QuranNoteRecord[]>;
  findOwnedById(tenantId: string, userId: string, noteId: string): Promise<QuranNoteRecord | null>;
  update(tenantId: string, userId: string, noteId: string, input: UpdateQuranNoteInput): Promise<QuranNoteRecord>;
  delete(tenantId: string, userId: string, noteId: string): Promise<void>;
}

export const QURAN_NOTE_REPOSITORY = Symbol('QURAN_NOTE_REPOSITORY');
