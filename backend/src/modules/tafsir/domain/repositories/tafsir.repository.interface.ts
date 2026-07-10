export interface TafsirRecord {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  source: string;
  language: string;
  text: string;
}

export interface CreateTafsirInput {
  surahNumber: number;
  ayahNumber: number;
  source: string;
  language: string;
  text: string;
}

export interface ITafsirRepository {
  findForAyah(surahNumber: number, ayahNumber: number, source?: string): Promise<TafsirRecord[]>;
  upsert(input: CreateTafsirInput): Promise<TafsirRecord>;
}

export const TAFSIR_REPOSITORY = Symbol('TAFSIR_REPOSITORY');
