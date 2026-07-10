export interface JuzRecord {
  id: string;
  juzNumber: number;
  startSurahNumber: number;
  startAyahNumber: number;
  endSurahNumber: number;
  endAyahNumber: number;
}

export interface QuranPageRecord {
  id: string;
  pageNumber: number;
  startSurahNumber: number;
  startAyahNumber: number;
  juzNumber: number;
}

export interface CreateJuzInput {
  juzNumber: number;
  startSurahNumber: number;
  startAyahNumber: number;
  endSurahNumber: number;
  endAyahNumber: number;
}

export interface CreateQuranPageInput {
  pageNumber: number;
  startSurahNumber: number;
  startAyahNumber: number;
  juzNumber: number;
}

export interface IQuranMetadataRepository {
  findAllJuzs(): Promise<JuzRecord[]>;
  findJuz(juzNumber: number): Promise<JuzRecord | null>;
  upsertJuz(input: CreateJuzInput): Promise<JuzRecord>;

  findAllPages(): Promise<QuranPageRecord[]>;
  findPage(pageNumber: number): Promise<QuranPageRecord | null>;
  upsertPage(input: CreateQuranPageInput): Promise<QuranPageRecord>;
}

export const QURAN_METADATA_REPOSITORY = Symbol('QURAN_METADATA_REPOSITORY');
