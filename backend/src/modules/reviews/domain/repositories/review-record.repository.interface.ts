import { EvaluationGrade } from '@shared/enums/memorization.enum';

export interface ReviewRangeInput {
  surahFrom: number;
  ayahFrom: number;
  surahTo: number;
  ayahTo: number;
}

export interface ReviewRecordItem {
  id: string;
  studentId: string;
  sessionId?: string;
  reviewedById: string;
  range: ReviewRangeInput;
  retentionGrade?: EvaluationGrade;
  nextReviewDueAt?: Date;
  notes?: string;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewRecordInput {
  tenantId: string;
  studentId: string;
  sessionId?: string;
  reviewedById: string;
  range: ReviewRangeInput;
  retentionGrade?: EvaluationGrade;
  nextReviewDueAt?: Date;
  reviewedAt?: Date;
  notes?: string;
}

export interface ReviewListFilter {
  studentId?: string;
  /** Filter by multiple student profile IDs — used for parent (multiple children) scoping. */
  studentIds?: string[];
  reviewedById?: string;
  sessionId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface RevisionPerformance {
  totalSessions: number;
  totalAyahsRevised: number;
  gradeBreakdown: Record<string, number>;
  averageAyahsPerSession: number;
  dueTodayCount: number;
}

export interface IReviewRecordRepository {
  create(input: CreateReviewRecordInput): Promise<ReviewRecordItem>;
  findById(tenantId: string, id: string): Promise<ReviewRecordItem | null>;
  findAll(
    tenantId: string,
    filter: ReviewListFilter,
    page?: number,
    limit?: number,
  ): Promise<{ items: ReviewRecordItem[]; total: number }>;
  getStudentPerformance(tenantId: string, studentId: string): Promise<RevisionPerformance>;
  /**
   * Returns total ayahs revised across all review records for a student
   * (for progress tracking).
   */
  getTotalAyahsRevised(tenantId: string, studentId: string): Promise<number>;
}

export const REVIEW_RECORD_REPOSITORY = Symbol('REVIEW_RECORD_REPOSITORY');
