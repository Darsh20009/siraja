import { AiFeatureType } from '@shared/enums/ai.enum';

export interface AiReportItem {
  id: string;
  studentId: string | null;
  type: AiFeatureType;
  content: string;
  structured?: Record<string, unknown>;
  sourceDataHash: string;
  modelVersion: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  createdAt: Date;
}

export interface CreateAiReportInput {
  tenantId: string;
  requestedBy: string;
  studentId: string | null;
  type: AiFeatureType;
  content: string;
  structured?: Record<string, unknown>;
  sourceDataHash: string;
  modelVersion: string;
}

/**
 * IAiInsightRepository — persists both the `ai_requests` job and its
 * `ai_reports` output atomically (Phase 11 pipelines are synchronous LLM
 * calls, not queued jobs, so a request is always created already
 * COMPLETED alongside its report; the two-collection split is kept for
 * consistency with the pre-existing schema and to leave room for a future
 * async pipeline — e.g. audio — that fills them at different times).
 */
export interface IAiInsightRepository {
  /** Most recent report of `type` for `studentId` (or tenant-wide when `studentId` is null), regardless of hash — used for cache comparison. */
  findLatest(tenantId: string, type: AiFeatureType, studentId: string | null): Promise<AiReportItem | null>;
  findById(tenantId: string, reportId: string): Promise<AiReportItem | null>;
  create(input: CreateAiReportInput): Promise<AiReportItem>;
  acknowledge(tenantId: string, reportId: string, userId: string): Promise<AiReportItem>;
  listForStudent(
    tenantId: string,
    studentId: string,
    page?: number,
    limit?: number,
  ): Promise<{ items: AiReportItem[]; total: number }>;
}

export const AI_INSIGHT_REPOSITORY = Symbol('AI_INSIGHT_REPOSITORY');
