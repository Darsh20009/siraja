import { AyahPerformanceStatus, HeatmapLevel } from '@shared/enums/smart-mushaf.enum';
import { EvaluationGrade } from '@shared/enums/memorization.enum';

export interface AyahPerformanceRecord {
  id: string;
  studentId: string;
  surahNumber: number;
  ayahNumber: number;
  status: AyahPerformanceStatus;
  confidenceScore: number;
  heatmapLevel: HeatmapLevel | null;
  mistakeCount: number;
  revisionCount: number;
  lastMemorizedAt: Date | null;
  lastRevisedAt: Date | null;
  lastMistakeAt: Date | null;
  updatedAt: Date;
}

export interface AyahPerformanceFilter {
  surahNumber?: number;
  heatmapLevel?: HeatmapLevel;
}

export interface ManualAyahPerformanceUpdate {
  status?: AyahPerformanceStatus;
  confidenceScore?: number;
}

export interface AyahPerformanceSummary {
  totalTracked: number;
  counts: Record<HeatmapLevel, number>;
  averageConfidenceScore: number;
}

export interface IAyahPerformanceRepository {
  findOne(
    tenantId: string,
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
  ): Promise<AyahPerformanceRecord | null>;

  findByStudent(
    tenantId: string,
    studentId: string,
    filter?: AyahPerformanceFilter,
  ): Promise<AyahPerformanceRecord[]>;

  /** Aggregate heatmap-level counts + average confidence for a student (whole tenant range or one surah). */
  getSummary(tenantId: string, studentId: string, surahNumber?: number): Promise<AyahPerformanceSummary>;

  /** Manual override by a sheikh/admin — recomputes `heatmapLevel` from the resulting state. Upserts. */
  manualUpdate(
    tenantId: string,
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
    input: ManualAyahPerformanceUpdate,
  ): Promise<AyahPerformanceRecord>;

  /** Internal: called after a memorization record is approved for the ayahs it covers. */
  recordMemorization(
    tenantId: string,
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
    grade?: EvaluationGrade,
  ): Promise<AyahPerformanceRecord>;

  /** Internal: called after a review (revision) session for the ayahs it covers. */
  recordRevision(
    tenantId: string,
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
    retentionGrade?: EvaluationGrade,
  ): Promise<AyahPerformanceRecord>;

  /** Internal: called after a mistake is logged against this ayah. */
  recordMistake(
    tenantId: string,
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
  ): Promise<AyahPerformanceRecord>;
}

export const AYAH_PERFORMANCE_REPOSITORY = Symbol('AYAH_PERFORMANCE_REPOSITORY');
