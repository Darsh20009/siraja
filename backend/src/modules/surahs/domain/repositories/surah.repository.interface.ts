export interface SurahRecord {
  id: string;
  surahNumber: number;
  arabicName: string;
  englishName: string;
  englishTranslationName: string;
  revelationType: string;
  ayahCount: number;
  revelationOrder?: number;
}

export interface CreateSurahInput {
  surahNumber: number;
  arabicName: string;
  englishName: string;
  englishTranslationName: string;
  revelationType: string;
  ayahCount: number;
  revelationOrder?: number;
}

export interface ISurahRepository {
  findAll(): Promise<SurahRecord[]>;
  findByNumber(surahNumber: number): Promise<SurahRecord | null>;
  searchByName(query: string): Promise<SurahRecord[]>;
  upsert(input: CreateSurahInput): Promise<SurahRecord>;
}

export const SURAH_REPOSITORY = Symbol('SURAH_REPOSITORY');
