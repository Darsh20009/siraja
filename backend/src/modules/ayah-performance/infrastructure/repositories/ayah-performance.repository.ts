import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AyahPerformance, AyahPerformanceDocument } from '@database/mongoose/schemas';
import { AyahPerformanceStatus, HeatmapLevel } from '@shared/enums/smart-mushaf.enum';
import { EvaluationGrade } from '@shared/enums/memorization.enum';
import {
  AyahPerformanceFilter,
  AyahPerformanceRecord,
  AyahPerformanceSummary,
  IAyahPerformanceRepository,
  ManualAyahPerformanceUpdate,
} from '../../domain/repositories/ayah-performance.repository.interface';

/**
 * Derives the display-ready heatmap bucket from the resulting
 * confidence score. `NOT_STARTED` ayahs have no heatmap level (there is
 * nothing to color on the Mushaf yet). Thresholds are a Phase 9 product
 * decision with no prior precedent in the codebase: >=85 Excellent,
 * >=65 Good, >=40 Needs Review, else Weak.
 */
function computeHeatmapLevel(status: AyahPerformanceStatus, confidenceScore: number): HeatmapLevel | null {
  if (status === AyahPerformanceStatus.NOT_STARTED) return null;
  if (confidenceScore >= 85) return HeatmapLevel.EXCELLENT;
  if (confidenceScore >= 65) return HeatmapLevel.GOOD;
  if (confidenceScore >= 40) return HeatmapLevel.NEEDS_REVIEW;
  return HeatmapLevel.WEAK;
}

/** Maps an evaluation/retention grade to a starting confidence score. No precedent elsewhere — Phase 9 decision. */
function confidenceForGrade(grade: EvaluationGrade | undefined, fallback: number): number {
  switch (grade) {
    case EvaluationGrade.EXCELLENT:
      return 95;
    case EvaluationGrade.VERY_GOOD:
      return 85;
    case EvaluationGrade.GOOD:
      return 70;
    case EvaluationGrade.ACCEPTABLE:
      return 55;
    case EvaluationGrade.WEAK:
      return 35;
    default:
      return fallback;
  }
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

@Injectable()
export class AyahPerformanceRepository implements IAyahPerformanceRepository {
  constructor(
    @InjectModel(AyahPerformance.name)
    private readonly model: Model<AyahPerformanceDocument>,
  ) {}

  async findOne(
    tenantId: string,
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
  ): Promise<AyahPerformanceRecord | null> {
    if (!Types.ObjectId.isValid(studentId)) return null;
    const doc = await this.model
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        student: new Types.ObjectId(studentId),
        surahNumber,
        ayahNumber,
        isDeleted: false,
      })
      .lean();
    return doc ? toRecord(doc) : null;
  }

  async findByStudent(
    tenantId: string,
    studentId: string,
    filter: AyahPerformanceFilter = {},
  ): Promise<AyahPerformanceRecord[]> {
    if (!Types.ObjectId.isValid(studentId)) return [];
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      student: new Types.ObjectId(studentId),
      isDeleted: false,
    };
    if (filter.surahNumber) query.surahNumber = filter.surahNumber;
    if (filter.heatmapLevel) query.heatmapLevel = filter.heatmapLevel;

    const docs = await this.model.find(query).sort({ surahNumber: 1, ayahNumber: 1 }).lean();
    return docs.map(toRecord);
  }

  async getSummary(tenantId: string, studentId: string, surahNumber?: number): Promise<AyahPerformanceSummary> {
    const counts: Record<HeatmapLevel, number> = {
      [HeatmapLevel.EXCELLENT]: 0,
      [HeatmapLevel.GOOD]: 0,
      [HeatmapLevel.NEEDS_REVIEW]: 0,
      [HeatmapLevel.WEAK]: 0,
    };
    if (!Types.ObjectId.isValid(studentId)) {
      return { totalTracked: 0, counts, averageConfidenceScore: 0 };
    }

    const match: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      student: new Types.ObjectId(studentId),
      isDeleted: false,
      status: { $ne: AyahPerformanceStatus.NOT_STARTED },
    };
    if (surahNumber) match.surahNumber = surahNumber;

    const docs = await this.model.find(match).select('heatmapLevel confidenceScore').lean();
    let totalConfidence = 0;
    for (const doc of docs) {
      if (doc.heatmapLevel) counts[doc.heatmapLevel as HeatmapLevel] += 1;
      totalConfidence += doc.confidenceScore ?? 0;
    }

    return {
      totalTracked: docs.length,
      counts,
      averageConfidenceScore: docs.length > 0 ? Math.round(totalConfidence / docs.length) : 0,
    };
  }

  async manualUpdate(
    tenantId: string,
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
    input: ManualAyahPerformanceUpdate,
  ): Promise<AyahPerformanceRecord> {
    const existing = await this.model
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        student: new Types.ObjectId(studentId),
        surahNumber,
        ayahNumber,
      })
      .lean();

    const status = input.status ?? existing?.status ?? AyahPerformanceStatus.IN_PROGRESS;
    const confidenceScore = clampScore(input.confidenceScore ?? existing?.confidenceScore ?? 0);
    const heatmapLevel = computeHeatmapLevel(status, confidenceScore);

    const doc = await this.model
      .findOneAndUpdate(
        { tenantId: new Types.ObjectId(tenantId), student: new Types.ObjectId(studentId), surahNumber, ayahNumber },
        { $set: { status, confidenceScore, heatmapLevel } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean();
    return toRecord(doc!);
  }

  async recordMemorization(
    tenantId: string,
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
    grade?: EvaluationGrade,
  ): Promise<AyahPerformanceRecord> {
    const confidenceScore = confidenceForGrade(grade, 75);
    const status = AyahPerformanceStatus.MEMORIZED;
    const heatmapLevel = computeHeatmapLevel(status, confidenceScore);

    const doc = await this.model
      .findOneAndUpdate(
        { tenantId: new Types.ObjectId(tenantId), student: new Types.ObjectId(studentId), surahNumber, ayahNumber },
        {
          $set: { status, confidenceScore, heatmapLevel, lastMemorizedAt: new Date() },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean();
    return toRecord(doc!);
  }

  async recordRevision(
    tenantId: string,
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
    retentionGrade?: EvaluationGrade,
  ): Promise<AyahPerformanceRecord> {
    const existing = await this.model
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        student: new Types.ObjectId(studentId),
        surahNumber,
        ayahNumber,
      })
      .lean();

    const baseline = existing?.confidenceScore ?? 60;
    const target = confidenceForGrade(retentionGrade, baseline);
    // Revisions nudge confidence toward the grade-implied target rather than
    // snapping to it outright — retains memory of prior performance.
    const confidenceScore = clampScore((baseline + target) / 2);
    const status =
      existing && existing.status !== AyahPerformanceStatus.NOT_STARTED
        ? existing.status
        : AyahPerformanceStatus.IN_PROGRESS;
    const heatmapLevel = computeHeatmapLevel(status, confidenceScore);

    const doc = await this.model
      .findOneAndUpdate(
        { tenantId: new Types.ObjectId(tenantId), student: new Types.ObjectId(studentId), surahNumber, ayahNumber },
        {
          $set: { status, confidenceScore, heatmapLevel, lastRevisedAt: new Date() },
          $inc: { revisionCount: 1 },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean();
    return toRecord(doc!);
  }

  async recordMistake(
    tenantId: string,
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
  ): Promise<AyahPerformanceRecord> {
    const existing = await this.model
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        student: new Types.ObjectId(studentId),
        surahNumber,
        ayahNumber,
      })
      .lean();

    const baseline = existing?.confidenceScore ?? 60;
    const confidenceScore = clampScore(baseline - 10);
    const priorStatus = existing?.status ?? AyahPerformanceStatus.NOT_STARTED;
    // A mistake never regresses an untouched ayah to "weak" on its own —
    // it only downgrades ayahs the student has already engaged with.
    const status =
      priorStatus === AyahPerformanceStatus.NOT_STARTED
        ? AyahPerformanceStatus.NOT_STARTED
        : confidenceScore < 40
          ? AyahPerformanceStatus.WEAK
          : priorStatus === AyahPerformanceStatus.MEMORIZED
            ? AyahPerformanceStatus.NEEDS_REVIEW
            : priorStatus;
    const heatmapLevel = computeHeatmapLevel(status, confidenceScore);

    const doc = await this.model
      .findOneAndUpdate(
        { tenantId: new Types.ObjectId(tenantId), student: new Types.ObjectId(studentId), surahNumber, ayahNumber },
        {
          $set: { status, confidenceScore, heatmapLevel, lastMistakeAt: new Date() },
          $inc: { mistakeCount: 1 },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean();
    return toRecord(doc!);
  }
}

function toRecord(doc: any): AyahPerformanceRecord {
  return {
    id: String(doc._id),
    studentId: String(doc.student),
    surahNumber: doc.surahNumber,
    ayahNumber: doc.ayahNumber,
    status: doc.status,
    confidenceScore: doc.confidenceScore,
    heatmapLevel: doc.heatmapLevel ?? null,
    mistakeCount: doc.mistakeCount ?? 0,
    revisionCount: doc.revisionCount ?? 0,
    lastMemorizedAt: doc.lastMemorizedAt ?? null,
    lastRevisedAt: doc.lastRevisedAt ?? null,
    lastMistakeAt: doc.lastMistakeAt ?? null,
    updatedAt: doc.updatedAt,
  };
}
