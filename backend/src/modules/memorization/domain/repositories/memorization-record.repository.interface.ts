import { EvaluationGrade, MemorizationStatus } from '@shared/enums/memorization.enum';

export interface QuranRangeInput {
  surahFrom: number;
  ayahFrom: number;
  surahTo: number;
  ayahTo: number;
}

export interface MemorizationRecordItem {
  id: string;
  studentId: string;
  sessionId?: string;
  evaluatedById: string;
  range: QuranRangeInput;
  status: MemorizationStatus;
  grade?: EvaluationGrade;
  score?: number;
  notes?: string;
  evaluatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMemorizationRecordInput {
  tenantId: string;
  studentId: string;
  sessionId?: string;
  evaluatedById: string;
  range: QuranRangeInput;
  notes?: string;
}

export interface UpdateMemorizationRecordInput {
  status?: MemorizationStatus;
  grade?: EvaluationGrade;
  score?: number;
  notes?: string;
}

export interface MemorizationListFilter {
  studentId?: string;
  /** Filter by multiple student profile IDs — used for parent (multiple children) scoping. */
  studentIds?: string[];
  evaluatedById?: string;
  sessionId?: string;
  status?: MemorizationStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface IMemorizationRecordRepository {
  create(input: CreateMemorizationRecordInput): Promise<MemorizationRecordItem>;
  findById(tenantId: string, id: string): Promise<MemorizationRecordItem | null>;
  findAll(
    tenantId: string,
    filter: MemorizationListFilter,
    page?: number,
    limit?: number,
  ): Promise<{ items: MemorizationRecordItem[]; total: number }>;
  /**
   * Returns aggregate counts for progress tracking — total records,
   * completed count, and total ayahs memorized from completed ranges.
   */
  getStudentStats(
    tenantId: string,
    studentId: string,
  ): Promise<{ total: number; completed: number; totalAyahsMemorized: number }>;
  update(tenantId: string, id: string, input: UpdateMemorizationRecordInput): Promise<MemorizationRecordItem>;
}

export const MEMORIZATION_RECORD_REPOSITORY = Symbol('MEMORIZATION_RECORD_REPOSITORY');
