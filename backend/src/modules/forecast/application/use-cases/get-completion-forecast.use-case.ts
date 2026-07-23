import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { QuranRange } from '@database/mongoose/schemas';
import {
  IStudentProgressRepository,
  STUDENT_PROGRESS_REPOSITORY,
} from '@modules/progress/domain/repositories/student-progress.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import {
  AYAH_PERFORMANCE_REPOSITORY,
  IAyahPerformanceRepository,
} from '@modules/ayah-performance/domain/repositories/ayah-performance.repository.interface';
import { MemorizationRecord, MemorizationRecordDocument } from '@database/mongoose/schemas';
import { MemorizationStatus } from '@shared/enums/memorization.enum';
import { HeatmapLevel } from '@shared/enums/smart-mushaf.enum';
import { Role } from '@shared/enums/roles.enum';

const TOTAL_QURAN_AYAHS = 6236;

export interface CompletionForecast {
  studentId: string;
  totalAyahsMemorized: number;
  remainingAyahs: number;
  memorizationPercentage: number;
  /** Avg ayahs memorized per active day over the last 30 days. */
  dailyPaceAyahs: number;
  /** Avg ayahs memorized per week over the last 4 weeks. */
  weeklyProjectionAyahs: number;
  /** Avg ayahs memorized per month over the last 3 months. */
  monthlyProjectionAyahs: number;
  /** ISO date string — null if pace is 0 (no data). */
  estimatedCompletionDate: string | null;
  /** Estimated days remaining at current pace — null if pace is 0. */
  estimatedDaysRemaining: number | null;
  /** 0–100 consistency score based on active days in last 30 days. */
  consistencyScore: number;
  /** Number of active memorization days in the last 30 days. */
  activeDaysLast30: number;

  // ── Phase 12B: SM-2 & mastery-aware fields ────────────────────────────

  /** Number of ayahs where smNextReviewDue <= today. */
  overdueRevisionCount: number;
  /**
   * 0–100 revision burden score.
   * 0 = no backlog; 100 = backlog equals 50%+ of memorized material.
   * Heavy burden reduces the adjusted completion estimate.
   */
  revisionBurdenScore: number;
  /** Completion date accounting for revision overhead — null if pace is 0. */
  adjustedCompletionDate: string | null;
  /** Days remaining with revision overhead included — null if pace is 0. */
  adjustedDaysRemaining: number | null;
  /** Ayahs with masteryScore >= 85 (strongly retained). */
  stronglyMemorizedCount: number;
  /** Ayahs with masteryScore < 55 but status = MEMORIZED (at risk). */
  weaklyMemorizedCount: number;
  /** Overall retention risk assessment. */
  retentionRisk: 'low' | 'medium' | 'high';
}

/**
 * GetCompletionForecastUseCase — Phase 7 + Phase 12B upgrade.
 *
 * Phase 12B additions: SM-2 overdue count, revision burden score,
 * adjusted completion estimate, mastery-aware retention risk.
 *
 * `studentId` is a Student profile ID (_id) for /forecast/students/:id,
 * OR user.sub (userId) when called from /forecast/me for STUDENT role.
 * For STUDENT role, the use-case always resolves the profile via userId.
 */
@Injectable()
export class GetCompletionForecastUseCase {
  constructor(
    @Inject(STUDENT_PROGRESS_REPOSITORY)
    private readonly progressRepo: IStudentProgressRepository,
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY)
    private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepo: IParentRepository,
    @Inject(AYAH_PERFORMANCE_REPOSITORY)
    private readonly ayahPerformanceRepo: IAyahPerformanceRepository,
    @InjectModel(MemorizationRecord.name)
    private readonly memModel: Model<MemorizationRecordDocument>,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string): Promise<CompletionForecast> {
    const roles = user.roles as Role[];
    let resolvedStudentId = studentId;

    // ── STUDENT: resolve profile from userId ──────────────────────────────
    if (roles.includes(Role.STUDENT)) {
      const ownProfile = await this.studentRepo.findByUserId(user.tenantId, user.sub);
      if (!ownProfile) throw new NotFoundException('Student profile not found.');
      if (studentId !== user.sub && studentId !== ownProfile.id) {
        throw new ForbiddenException('Students may only access their own forecast.');
      }
      resolvedStudentId = ownProfile.id;
    } else {
      // For non-STUDENT roles, studentId is a Student profile ID.
      const student = await this.studentRepo.findById(user.tenantId, studentId);
      if (!student) throw new NotFoundException('Student not found.');

      if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN) && !roles.includes(Role.SUPERVISOR)) {
        const sheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
        if (!sheikh) throw new ForbiddenException('Sheikh profile not found.');
        const isAssigned =
          student.sheikhId === sheikh.id ||
          (student.groupId != null && sheikh.groupIds.includes(student.groupId));
        if (!isAssigned) throw new ForbiddenException('Sheikhs may only access their assigned students.');
      } else if (roles.includes(Role.PARENT)) {
        const parent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
        if (!parent || !parent.studentIds.includes(studentId)) {
          throw new ForbiddenException('Parents may only access linked children.');
        }
      }
      // TENANT_ADMIN / SUPERVISOR: unrestricted — no additional check needed.
    }

    return this.computeForecast(user.tenantId, resolvedStudentId);
  }

  private async computeForecast(tenantId: string, studentId: string): Promise<CompletionForecast> {
    const now = new Date();

    // Fetch base progress + SM-2 data in parallel
    const [progress, ayahPerformanceRecords] = await Promise.all([
      this.progressRepo.findByStudent(tenantId, studentId),
      this.ayahPerformanceRepo.findByStudent(tenantId, studentId),
    ]);

    const totalAyahsMemorized = progress?.totalAyahsMemorized ?? 0;
    const remainingAyahs = Math.max(0, TOTAL_QURAN_AYAHS - totalAyahsMemorized);

    // ── Pace calculation (Phase 7 logic, unchanged) ──────────────────────
    const tenantOid = new Types.ObjectId(tenantId);
    const studentOid = new Types.ObjectId(studentId);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const recentDocs = await this.memModel
      .find({
        tenantId: tenantOid,
        student: studentOid,
        status: MemorizationStatus.COMPLETED,
        isDeleted: false,
        evaluatedAt: { $gte: thirtyDaysAgo },
      })
      .select('range evaluatedAt')
      .lean();

    const dayMap = new Map<string, number>();
    for (const doc of recentDocs) {
      const range = doc.range as QuranRange;
      if (!range) continue;
      const ayahs = estimateAyahsInRange(range);
      const dateKey = new Date(doc.evaluatedAt as Date).toISOString().split('T')[0];
      dayMap.set(dateKey, (dayMap.get(dateKey) ?? 0) + ayahs);
    }

    const activeDaysLast30 = dayMap.size;
    const totalAyahsLast30 = [...dayMap.values()].reduce((a, b) => a + b, 0);
    const dailyPaceAyahs = activeDaysLast30 > 0 ? totalAyahsLast30 / activeDaysLast30 : 0;
    const weeklyProjectionAyahs = parseFloat((dailyPaceAyahs * 7).toFixed(1));
    const monthlyProjectionAyahs = parseFloat((dailyPaceAyahs * 30).toFixed(1));
    const consistencyScore = Math.round((activeDaysLast30 / 30) * 100);

    let estimatedDaysRemaining: number | null = null;
    let estimatedCompletionDate: string | null = null;

    if (dailyPaceAyahs > 0 && remainingAyahs > 0) {
      estimatedDaysRemaining = Math.ceil(remainingAyahs / dailyPaceAyahs);
      const completionDate = new Date(now);
      completionDate.setDate(now.getDate() + estimatedDaysRemaining);
      estimatedCompletionDate = completionDate.toISOString().split('T')[0];
    } else if (remainingAyahs === 0) {
      estimatedDaysRemaining = 0;
      estimatedCompletionDate = now.toISOString().split('T')[0];
    }

    // ── Phase 12B: SM-2 & mastery signals ───────────────────────────────
    const nowMs = now.getTime();

    let overdueRevisionCount = 0;
    let stronglyMemorizedCount = 0;
    let weaklyMemorizedCount = 0;

    for (const r of ayahPerformanceRecords) {
      if (r.smNextReviewDue && r.smNextReviewDue.getTime() <= nowMs) {
        overdueRevisionCount++;
      }
      if (r.masteryScore >= 85) {
        stronglyMemorizedCount++;
      } else if (r.masteryScore < 55 && r.heatmapLevel !== null &&
                 r.heatmapLevel !== HeatmapLevel.WEAK) {
        weaklyMemorizedCount++;
      }
    }

    // Revision burden: proportion of memorized material that is overdue, scaled 0–100
    const burdenScore =
      totalAyahsMemorized > 0
        ? Math.min(100, Math.round((overdueRevisionCount / totalAyahsMemorized) * 200))
        : 0;

    // Adjusted capacity: heavy backlog reduces effective new-memorization rate
    let adjustedDaysRemaining: number | null = null;
    let adjustedCompletionDate: string | null = null;

    if (dailyPaceAyahs > 0 && remainingAyahs > 0) {
      const adjustedCapacity = dailyPaceAyahs * Math.max(0.3, 1 - burdenScore / 200);
      adjustedDaysRemaining = Math.ceil(remainingAyahs / adjustedCapacity);
      const adjDate = new Date(now);
      adjDate.setDate(now.getDate() + adjustedDaysRemaining);
      adjustedCompletionDate = adjDate.toISOString().split('T')[0];
    } else if (remainingAyahs === 0) {
      adjustedDaysRemaining = 0;
      adjustedCompletionDate = now.toISOString().split('T')[0];
    }

    // Retention risk
    const overdueRatio = totalAyahsMemorized > 0 ? overdueRevisionCount / totalAyahsMemorized : 0;
    const retentionRisk: 'low' | 'medium' | 'high' =
      overdueRatio < 0.05 ? 'low' : overdueRatio < 0.20 ? 'medium' : 'high';

    return {
      studentId,
      totalAyahsMemorized,
      remainingAyahs,
      memorizationPercentage: progress?.memorizationPercentage ?? 0,
      dailyPaceAyahs: parseFloat(dailyPaceAyahs.toFixed(1)),
      weeklyProjectionAyahs,
      monthlyProjectionAyahs,
      estimatedCompletionDate,
      estimatedDaysRemaining,
      consistencyScore,
      activeDaysLast30,
      // Phase 12B
      overdueRevisionCount,
      revisionBurdenScore: burdenScore,
      adjustedCompletionDate,
      adjustedDaysRemaining,
      stronglyMemorizedCount,
      weaklyMemorizedCount,
      retentionRisk,
    };
  }
}

function estimateAyahsInRange(range: {
  surahFrom: number;
  ayahFrom: number;
  surahTo: number;
  ayahTo: number;
}): number {
  if (range.surahFrom === range.surahTo) {
    return Math.max(0, range.ayahTo - range.ayahFrom + 1);
  }
  const surahSpan = range.surahTo - range.surahFrom;
  return Math.max(1, surahSpan * 10 + range.ayahTo - range.ayahFrom + 1);
}
