import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AyahPerformance, AyahPerformanceDocument } from '@database/mongoose/schemas';
import { AyahPerformanceStatus, HeatmapLevel } from '@shared/enums/smart-mushaf.enum';
import { EvaluationGrade } from '@shared/enums/memorization.enum';
import { MasteryScoreEngine } from '@shared/learning/mastery-score.engine';
import { Sm2Engine, Sm2State } from '@shared/learning/sm2.engine';
import {
  AyahPerformanceFilter,
  AyahPerformanceRecord,
  AyahPerformanceSummary,
  IAyahPerformanceRepository,
  ManualAyahPerformanceUpdate,
} from '../../domain/repositories/ayah-performance.repository.interface';

/**
 * Derives the display-ready heatmap bucket from the mastery score and status.
 * `NOT_STARTED` ayahs have no heatmap level (nothing to color yet).
 * Thresholds mirror Phase 9 decisions but are now driven by masteryScore.
 */
function computeHeatmapLevel(status: AyahPerformanceStatus, masteryScore: number): HeatmapLevel | null {
  if (status === AyahPerformanceStatus.NOT_STARTED) return null;
  if (masteryScore >= 85) return HeatmapLevel.EXCELLENT;
  if (masteryScore >= 65) return HeatmapLevel.GOOD;
  if (masteryScore >= 40) return HeatmapLevel.NEEDS_REVIEW;
  return HeatmapLevel.WEAK;
}

/**
 * Derives AyahPerformanceStatus from masteryScore after a successful memorization/revision.
 */
function statusFromScore(masteryScore: number): AyahPerformanceStatus {
  if (masteryScore >= 40) return AyahPerformanceStatus.MEMORIZED;
  return AyahPerformanceStatus.WEAK;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

@Injectable()
export class AyahPerformanceRepository implements IAyahPerformanceRepository {
  private readonly masteryEngine = new MasteryScoreEngine();
  private readonly sm2Engine = new Sm2Engine();

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
    };
    if (surahNumber) match.surahNumber = surahNumber;

    const results = await this.model
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$heatmapLevel',
            count: { $sum: 1 },
            avgScore: { $avg: '$masteryScore' },
          },
        },
      ])
      .exec();

    let total = 0;
    let weightedSum = 0;
    for (const r of results) {
      if (r._id && r._id in counts) {
        counts[r._id as HeatmapLevel] = r.count;
      }
      total += r.count;
      weightedSum += (r.avgScore ?? 0) * r.count;
    }

    return {
      totalTracked: total,
      counts,
      averageConfidenceScore: total > 0 ? Math.round(weightedSum / total) : 0,
    };
  }

  async manualUpdate(
    tenantId: string,
    studentId: string,
    surahNumber: number,
    ayahNumber: number,
    input: ManualAyahPerformanceUpdate,
  ): Promise<AyahPerformanceRecord> {
    if (!Types.ObjectId.isValid(studentId)) throw new Error('Invalid studentId');

    const existing = await this.model
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        student: new Types.ObjectId(studentId),
        surahNumber,
        ayahNumber,
      })
      .lean();

    const status = input.status ?? existing?.status ?? AyahPerformanceStatus.NOT_STARTED;
    const rawScore = input.confidenceScore ?? existing?.masteryScore ?? 0;
    const masteryScore = clamp(rawScore, 0, 100);
    const heatmapLevel = computeHeatmapLevel(status, masteryScore);

    const doc = await this.model
      .findOneAndUpdate(
        { tenantId: new Types.ObjectId(tenantId), student: new Types.ObjectId(studentId), surahNumber, ayahNumber },
        { $set: { status, confidenceScore: masteryScore, masteryScore, heatmapLevel } },
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
    if (!Types.ObjectId.isValid(studentId)) throw new Error('Invalid studentId');

    const existing = await this.model
      .findOne({ tenantId: new Types.ObjectId(tenantId), student: new Types.ObjectId(studentId), surahNumber, ayahNumber })
      .lean();

    const currentSm2: Sm2State = extractSm2(existing);
    const newSm2 = this.sm2Engine.onSuccess(currentSm2, grade);

    const lastActivityAt = new Date();
    const masteryScore = this.masteryEngine.compute({
      grade,
      lastActivityAt,
      mistakeCount: existing?.mistakeCount ?? 0,
      revisionCount: existing?.revisionCount ?? 0,
    });
    const status = statusFromScore(masteryScore);
    const heatmapLevel = computeHeatmapLevel(status, masteryScore);

    const doc = await this.model
      .findOneAndUpdate(
        { tenantId: new Types.ObjectId(tenantId), student: new Types.ObjectId(studentId), surahNumber, ayahNumber },
        {
          $set: {
            status,
            confidenceScore: masteryScore,
            masteryScore,
            heatmapLevel,
            lastMemorizedAt: lastActivityAt,
            ...newSm2,
          },
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
    if (!Types.ObjectId.isValid(studentId)) throw new Error('Invalid studentId');

    const existing = await this.model
      .findOne({ tenantId: new Types.ObjectId(tenantId), student: new Types.ObjectId(studentId), surahNumber, ayahNumber })
      .lean();

    const currentSm2: Sm2State = extractSm2(existing);
    const newSm2 = this.sm2Engine.onSuccess(currentSm2, retentionGrade);

    const lastActivityAt = new Date();
    const newRevisionCount = (existing?.revisionCount ?? 0) + 1;

    const masteryScore = this.masteryEngine.compute({
      grade: retentionGrade,
      lastActivityAt,
      mistakeCount: existing?.mistakeCount ?? 0,
      revisionCount: newRevisionCount,
    });
    const priorStatus = existing?.status ?? AyahPerformanceStatus.NOT_STARTED;
    const status =
      priorStatus === AyahPerformanceStatus.NOT_STARTED
        ? AyahPerformanceStatus.NOT_STARTED
        : masteryScore >= 40
          ? AyahPerformanceStatus.MEMORIZED
          : AyahPerformanceStatus.WEAK;
    const heatmapLevel = computeHeatmapLevel(status, masteryScore);

    const doc = await this.model
      .findOneAndUpdate(
        { tenantId: new Types.ObjectId(tenantId), student: new Types.ObjectId(studentId), surahNumber, ayahNumber },
        {
          $set: {
            status,
            confidenceScore: masteryScore,
            masteryScore,
            heatmapLevel,
            lastRevisedAt: lastActivityAt,
            ...newSm2,
          },
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
    if (!Types.ObjectId.isValid(studentId)) throw new Error('Invalid studentId');

    const existing = await this.model
      .findOne({ tenantId: new Types.ObjectId(tenantId), student: new Types.ObjectId(studentId), surahNumber, ayahNumber })
      .lean();

    const currentSm2: Sm2State = extractSm2(existing);
    const newSm2 = this.sm2Engine.onMistake(currentSm2);

    const newMistakeCount = (existing?.mistakeCount ?? 0) + 1;
    const currentMastery = existing?.masteryScore ?? 60;
    const masteryScore = this.masteryEngine.applyMistakePenalty(currentMastery, newMistakeCount);

    const priorStatus = existing?.status ?? AyahPerformanceStatus.NOT_STARTED;
    const status =
      priorStatus === AyahPerformanceStatus.NOT_STARTED
        ? AyahPerformanceStatus.NOT_STARTED
        : masteryScore < 40
          ? AyahPerformanceStatus.WEAK
          : priorStatus === AyahPerformanceStatus.MEMORIZED
            ? AyahPerformanceStatus.NEEDS_REVIEW
            : priorStatus;
    const heatmapLevel = computeHeatmapLevel(status, masteryScore);

    const doc = await this.model
      .findOneAndUpdate(
        { tenantId: new Types.ObjectId(tenantId), student: new Types.ObjectId(studentId), surahNumber, ayahNumber },
        {
          $set: {
            status,
            confidenceScore: masteryScore,
            masteryScore,
            heatmapLevel,
            lastMistakeAt: new Date(),
            ...newSm2,
          },
          $inc: { mistakeCount: 1 },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean();
    return toRecord(doc!);
  }

  async findOverdueRevisions(tenantId: string, studentId: string): Promise<AyahPerformanceRecord[]> {
    if (!Types.ObjectId.isValid(studentId)) return [];
    const now = new Date();
    const docs = await this.model
      .find({
        tenantId: new Types.ObjectId(tenantId),
        student: new Types.ObjectId(studentId),
        smNextReviewDue: { $lte: now, $ne: null },
        isDeleted: false,
      })
      .sort({ smNextReviewDue: 1 }) // oldest overdue first
      .lean();
    return docs.map(toRecord);
  }

  async findWeakest(tenantId: string, studentId: string, limit = 20): Promise<AyahPerformanceRecord[]> {
    if (!Types.ObjectId.isValid(studentId)) return [];
    const docs = await this.model
      .find({
        tenantId: new Types.ObjectId(tenantId),
        student: new Types.ObjectId(studentId),
        status: { $ne: AyahPerformanceStatus.NOT_STARTED },
        isDeleted: false,
      })
      .sort({ masteryScore: 1 }) // lowest mastery first
      .limit(limit)
      .lean();
    return docs.map(toRecord);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Extract SM-2 state from a DB document (or return defaults if missing). */
function extractSm2(doc: any): Sm2State {
  return {
    smEasinessFactor: doc?.smEasinessFactor ?? 2.5,
    smInterval: doc?.smInterval ?? 0,
    smRepetitions: doc?.smRepetitions ?? 0,
    smNextReviewDue: doc?.smNextReviewDue ?? null,
  };
}

function toRecord(doc: any): AyahPerformanceRecord {
  return {
    id: String(doc._id),
    studentId: String(doc.student),
    surahNumber: doc.surahNumber,
    ayahNumber: doc.ayahNumber,
    status: doc.status,
    confidenceScore: doc.confidenceScore ?? 0,
    masteryScore: doc.masteryScore ?? 0,
    heatmapLevel: doc.heatmapLevel ?? null,
    mistakeCount: doc.mistakeCount ?? 0,
    revisionCount: doc.revisionCount ?? 0,
    lastMemorizedAt: doc.lastMemorizedAt ?? null,
    lastRevisedAt: doc.lastRevisedAt ?? null,
    lastMistakeAt: doc.lastMistakeAt ?? null,
    smEasinessFactor: doc.smEasinessFactor ?? 2.5,
    smInterval: doc.smInterval ?? 0,
    smRepetitions: doc.smRepetitions ?? 0,
    smNextReviewDue: doc.smNextReviewDue ?? null,
    updatedAt: doc.updatedAt,
  };
}
