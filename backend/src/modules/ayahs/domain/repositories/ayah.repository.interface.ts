export interface AyahRecord {
  id: string;
  globalAyahNumber: number;
  surahNumber: number;
  ayahNumber: number;
  pageNumber: number;
  juzNumber: number;
  hizbNumber: number;
  arabicText: string;
}

export interface CreateAyahInput {
  globalAyahNumber: number;
  surahNumber: number;
  ayahNumber: number;
  pageNumber: number;
  juzNumber: number;
  hizbNumber: number;
  arabicText: string;
  arabicTextNormalized: string;
}

export interface IAyahRepository {
  findBySurah(surahNumber: number): Promise<AyahRecord[]>;
  findOne(surahNumber: number, ayahNumber: number): Promise<AyahRecord | null>;
  findByPage(pageNumber: number): Promise<AyahRecord[]>;
  findByJuz(juzNumber: number): Promise<AyahRecord[]>;
  /** `normalizedQuery` must already be diacritic-stripped (see `TextNormalizerService`). */
  searchByText(normalizedQuery: string): Promise<AyahRecord[]>;
  upsert(input: CreateAyahInput): Promise<AyahRecord>;
}

export const AYAH_REPOSITORY = Symbol('AYAH_REPOSITORY');
