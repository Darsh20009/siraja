import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { MemorizationStatus, MistakeResolutionStatus } from '@shared/enums/memorization.enum';

import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { IStudentProgressRepository, STUDENT_PROGRESS_REPOSITORY } from '@modules/progress/domain/repositories/student-progress.repository.interface';
import { IMemorizationRecordRepository, MEMORIZATION_RECORD_REPOSITORY } from '@modules/memorization/domain/repositories/memorization-record.repository.interface';
import { IReviewRecordRepository, REVIEW_RECORD_REPOSITORY } from '@modules/reviews/domain/repositories/review-record.repository.interface';
import { IQuranMistakeRepository, QURAN_MISTAKE_REPOSITORY } from '@modules/mistakes/domain/repositories/quran-mistake.repository.interface';
import { IAttendanceRepository, ATTENDANCE_REPOSITORY } from '@modules/attendance/domain/repositories/attendance.repository.interface';
import { IAyahPerformanceRepository, AYAH_PERFORMANCE_REPOSITORY } from '@modules/ayah-performance/domain/repositories/ayah-performance.repository.interface';

import { MemorizationEngine, MemorizationSessionData } from '../../domain/engines/memorization.engine';
import { RevisionEngine, RevisionSessionData, AyahSm2Data } from '../../domain/engines/revision.engine';
import { MistakeEngine, MistakeData } from '../../domain/engines/mistake.engine';
import { DifficultyEngine } from '../../domain/engines/difficulty.engine';
import { StudentProfileEngine } from '../../domain/engines/student-profile.engine';
import { RecommendationEngine } from '../../domain/engines/recommendation.engine';
import { ParentInsight, ChildSummary } from '../../domain/entities/parent-insight.entity';
import { AttendanceRules } from '../../domain/rules/attendance.rules';

/**
 * GetParentInsightsUseCase — Phase 13A.
 *
 * Builds a ParentInsight covering all the parent's linked children.
 * Each child's profile and top recommendations are computed independently.
 *
 * RBAC:
 *   PARENT         → own children only (parentId must match their profile)
 *   TENANT_ADMIN / SUPERVISOR → any parent
 */
@Injectable()
export class GetParentInsightsUseCase {
  private readonly memEngine = new MemorizationEngine();
  private readonly revEngine = new RevisionEngine();
  private readonly misEngine = new MistakeEngine();
  private readonly diffEngine = new DifficultyEngine();
  private readonly profileEngine = new StudentProfileEngine();
  private readonly recEngine = new RecommendationEngine();

  constructor(
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(STUDENT_PROGRESS_REPOSITORY) private readonly progressRepo: IStudentProgressRepository,
    @Inject(MEMORIZATION_RECORD_REPOSITORY) private readonly memRepo: IMemorizationRecordRepository,
    @Inject(REVIEW_RECORD_REPOSITORY) private readonly reviewRepo: IReviewRecordRepository,
    @Inject(QURAN_MISTAKE_REPOSITORY) private readonly mistakeRepo: IQuranMistakeRepository,
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendanceRepo: IAttendanceRepository,
    @Inject(AYAH_PERFORMANCE_REPOSITORY) private readonly ayahPerfRepo: IAyahPerformanceRepository,
  ) {}

  async execute(user: AccessTokenPayload, parentId: string): Promise<ParentInsight> {
    const roles = user.roles as Role[];

    // ── Load parent profile ───────────────────────────────────────────────────
    const parent = await this.parentRepo.findById(user.tenantId, parentId);
    if (!parent) throw new NotFoundException('Parent not found.');

    // ── Access control ────────────────────────────────────────────────────────
    if (roles.includes(Role.PARENT) && !roles.includes(Role.TENANT_ADMIN) && !roles.includes(Role.SUPERVISOR)) {
      const ownParent = await this.parentRepo.findByUserId(user.tenantId, user.sub);
      if (!ownParent || ownParent.id !== parent.id) {
        throw new ForbiddenException('Parents may only access their own children\'s insights.');
      }
    }

    // ── Build per-child summaries in parallel ─────────────────────────────────
    const children: ChildSummary[] = await Promise.all(
      parent.studentIds.map(sid => this.buildChildSummary(user.tenantId, sid)),
    );

    // ── Aggregate ─────────────────────────────────────────────────────────────
    const n = children.length;
    const aggregate = {
      totalChildren: n,
      averageMemorizationScore: n > 0
        ? Math.round(children.reduce((s, c) => s + c.memorizationScore, 0) / n) : 0,
      averageAttendanceScore: n > 0
        ? Math.round(children.reduce((s, c) => s + c.attendanceScore, 0) / n) : 0,
      totalOpenMistakes: children.reduce((s, c) => s + c.openMistakes, 0),
      childrenWithHighForgettingRisk: children.filter(c => c.forgettingRisk === 'high').length,
      childrenWithLowAttendance: children.filter(c => c.attendanceScore <= AttendanceRules.SCORE_LOW).length,
    };

    return {
      parentId,
      tenantId: user.tenantId,
      generatedAt: new Date(),
      children,
      aggregate,
    };
  }

  private async buildChildSummary(tenantId: string, studentId: string): Promise<ChildSummary> {
    const [progress, memRecords, reviewRecords, mistakes, attendance, ayahPerf] = await Promise.all([
      this.progressRepo.findByStudent(tenantId, studentId),
      this.memRepo.findAll(tenantId, { studentId, status: MemorizationStatus.COMPLETED }, 1, 300),
      this.reviewRepo.findAll(tenantId, { studentId }, 1, 300),
      this.mistakeRepo.findAll(tenantId, { studentId }, 1, 300),
      this.attendanceRepo.getStudentAttendanceRate(tenantId, studentId),
      this.ayahPerfRepo.findByStudent(tenantId, studentId),
    ]);

    const totalAyahsMemorized = progress?.totalAyahsMemorized ?? 0;

    const memSessions: MemorizationSessionData[] = memRecords.items.map(r => ({
      score: r.score, grade: r.grade,
      ayahsCount: estimateAyahsInRange(r.range), evaluatedAt: r.evaluatedAt,
    }));
    const revSessions: RevisionSessionData[] = reviewRecords.items.map(r => ({
      retentionGrade: r.retentionGrade, ayahsCount: estimateAyahsInRange(r.range),
      reviewedAt: r.reviewedAt, nextReviewDueAt: r.nextReviewDueAt,
    }));
    const sm2: AyahSm2Data[] = ayahPerf.map(a => ({
      smNextReviewDue: a.smNextReviewDue, masteryScore: a.masteryScore,
    }));
    const mistakeItems: MistakeData[] = mistakes.items.map(m => ({
      id: m.id, surahNumber: m.surahNumber, ayahNumber: m.ayahNumber,
      type: m.type, severity: m.severity,
      resolutionStatus: m.resolutionStatus as MistakeResolutionStatus, createdAt: m.createdAt,
    }));

    const memA = this.memEngine.analyse(memSessions);
    const revA = this.revEngine.analyse(revSessions, sm2, totalAyahsMemorized);
    const misA = this.misEngine.analyse(mistakeItems, totalAyahsMemorized);
    const avgEF = ayahPerf.length > 0
      ? ayahPerf.reduce((s, a) => s + (a.smEasinessFactor ?? 2.5), 0) / ayahPerf.length : 2.5;
    const diffA = this.diffEngine.analyse({
      gradeDistribution: memA.gradeDistribution, totalSessions: memA.totalSessions,
      totalMistakes: misA.totalMistakes, averageSmEasinessFactor: avgEF,
      mistakeRatePerAyah: misA.mistakeRatePerAyah, averageScore: memA.averageScore,
    });

    const prof = this.profileEngine.build({
      studentId, tenantId, totalAyahsMemorized,
      memorizationPercentage: progress?.memorizationPercentage ?? 0,
      memorizationAnalysis: memA, revisionAnalysis: revA,
      mistakeAnalysis: misA, difficultyAnalysis: diffA,
      attendance: { attendanceRate: attendance.attendanceRate },
      ayahPerformance: {
        totalAyahs: ayahPerf.length,
        retainedAyahs: ayahPerf.filter(a => a.masteryScore >= 60).length,
        averageSmEasinessFactor: avgEF,
      },
    });

    const recs = this.recEngine.generate(prof, misA, revA, memA);

    const lastMemDate = memRecords.items.length > 0
      ? memRecords.items.reduce((a, b) => a.evaluatedAt > b.evaluatedAt ? a : b).evaluatedAt.toISOString()
      : null;
    const lastRevDate = reviewRecords.items.length > 0
      ? reviewRecords.items.reduce((a, b) => a.reviewedAt > b.reviewedAt ? a : b).reviewedAt.toISOString()
      : null;

    return {
      studentId,
      memorizationScore: prof.memorizationScore,
      revisionScore: prof.revisionScore,
      attendanceScore: prof.attendanceScore,
      consistencyScore: prof.consistencyScore,
      forgettingRisk: prof.forgettingRisk,
      totalAyahsMemorized,
      memorizationPercentage: prof.memorizationPercentage,
      overdueRevisionCount: prof.overdueRevisionCount,
      openMistakes: misA.openMistakes,
      recommendations: recs.slice(0, 3),
      lastMemorizationDate: lastMemDate,
      lastRevisionDate: lastRevDate,
      activeDaysLast30: memA.activeDaysLast30,
    };
  }
}

function estimateAyahsInRange(range: {
  surahFrom: number; ayahFrom: number; surahTo: number; ayahTo: number;
}): number {
  if (range.surahFrom === range.surahTo) return Math.max(0, range.ayahTo - range.ayahFrom + 1);
  return Math.max(1, (range.surahTo - range.surahFrom) * 10 + range.ayahTo - range.ayahFrom + 1);
}
