import { MistakeResolutionStatus, MistakeSeverity, MistakeType } from '@shared/enums/memorization.enum';

export interface QuranMistakeItem {
  id: string;
  studentId: string;
  memorizationRecordId?: string;
  reviewRecordId?: string;
  surahNumber: number;
  ayahNumber: number;
  type: MistakeType;
  severity: MistakeSeverity;
  note?: string;
  resolutionStatus: MistakeResolutionStatus;
  resolvedAt?: Date | null;
  resolvedById?: string | null;
  createdAt: Date;
}

export interface LogMistakeInput {
  tenantId: string;
  studentId: string;
  memorizationRecordId?: string;
  reviewRecordId?: string;
  surahNumber: number;
  ayahNumber: number;
  type: MistakeType;
  severity: MistakeSeverity;
  note?: string;
}

export interface MistakeListFilter {
  studentId?: string;
  /** Filter by multiple student profile IDs — used for parent and sheikh scoping. */
  studentIds?: string[];
  memorizationRecordId?: string;
  reviewRecordId?: string;
  type?: MistakeType;
  severity?: MistakeSeverity;
  resolutionStatus?: MistakeResolutionStatus;
  surahNumber?: number;
}

export interface MistakeFrequencyItem {
  type: MistakeType;
  count: number;
  surahNumber?: number;
}

export interface IQuranMistakeRepository {
  log(input: LogMistakeInput): Promise<QuranMistakeItem>;
  findById(tenantId: string, id: string): Promise<QuranMistakeItem | null>;
  findAll(
    tenantId: string,
    filter: MistakeListFilter,
    page?: number,
    limit?: number,
  ): Promise<{ items: QuranMistakeItem[]; total: number }>;
  resolve(tenantId: string, id: string, resolvedById: string): Promise<QuranMistakeItem>;
  /**
   * Returns mistake counts grouped by type for a student, optionally
   * filtered to a specific surah — used by the frequency dashboard.
   */
  getFrequency(
    tenantId: string,
    studentId: string,
    surahNumber?: number,
  ): Promise<MistakeFrequencyItem[]>;
}

export const QURAN_MISTAKE_REPOSITORY = Symbol('QURAN_MISTAKE_REPOSITORY');
