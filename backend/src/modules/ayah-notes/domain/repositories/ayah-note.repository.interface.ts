export interface AyahNoteRecord {
  id: string;
  studentId: string;
  authorId: string;
  surahNumber: number;
  ayahNumber: number;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAyahNoteInput {
  tenantId: string;
  studentId: string;
  authorId: string;
  surahNumber: number;
  ayahNumber: number;
  text: string;
}

export interface AyahNoteFilter {
  surahNumber?: number;
  ayahNumber?: number;
}

export interface IAyahNoteRepository {
  create(input: CreateAyahNoteInput): Promise<AyahNoteRecord>;
  findById(tenantId: string, noteId: string): Promise<AyahNoteRecord | null>;
  findByStudent(tenantId: string, studentId: string, filter?: AyahNoteFilter): Promise<AyahNoteRecord[]>;
  update(tenantId: string, noteId: string, text: string): Promise<AyahNoteRecord>;
  delete(tenantId: string, noteId: string): Promise<void>;
}

export const AYAH_NOTE_REPOSITORY = Symbol('AYAH_NOTE_REPOSITORY');
