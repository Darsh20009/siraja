import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { MemorizationStatus, MistakeResolutionStatus } from '@shared/enums/memorization.enum';

import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
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
import { AnalyticsEngine } from '../../domain/engines/analytics.engine';
import { SheikhInsight, StudentBrief } from '../../domain/entities/sheikh-insight.entity';
import { StudentIntelligenceProfile } from '../../domain/entities/student-intelligence-profile.entity';

/**
 * GetSheikhInsightsUseCase — Phase 13A.
 *
 * Builds a class-level SheikhInsight covering all assigned students with
 * aggregate analytics and per-student performance briefs.
 *
 * RBAC:
 *   SHEIKH         → own assigned students only
 *   TENANT_ADMIN / SUPERVISOR → any sheikh's students
 */
@Injectable()
export class GetSheikhInsightsUseCase {
  private readonly memEngine = new MemorizationEngine();
  private readonly revEngine = new RevisionEngine();
  private readonly misEngine = new MistakeEngine();
  private readonly diffEngine = new DifficultyEngine();
  private readonly profileEngine = new StudentProfileEngine();
  private readonly recEngine = new RecommendationEngine();
  private readonly analyticsEngine = new AnalyticsEngine();

  constructor(
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(STUDENT_PROGRESS_REPOSITORY) private readonly progressRepo: IStudentProgressRepository,
    @Inject(MEMORIZATION_RECORD_REPOSITORY) private readonly memRepo: IMemorizationRecordRepository,
    @Inject(REVIEW_RECORD_REPOSITORY) private readonly reviewRepo: IReviewRecordRepository,
    @Inject(QURAN_MISTAKE_REPOSITORY) private readonly mistakeRepo: IQuranMistakeRepository,
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendanceRepo: IAttendanceRepository,
    @Inject(AYAH_PERFORMANCE_REPOSITORY) private readonly ayahPerfRepo: IAyahPerformanceRepository,
  ) {}

  async execute(user: AccessTokenPayload, sheikhId: string): Promise<SheikhInsight> {
    const roles = user.roles as Role[];

    const sheikh = await this.sheikhRepo.findById(user.tenantId, sheikhId);
    if (!sheikh) throw new NotFoundException('Sheikh not found.');

    // ── Access control ────────────────────────────────────────────────────────
    if (roles.includes(Role.SHEIKH) && !roles.includes(Role.TENANT_ADMIN) && !roles.includes(Role.SUPERVISOR)) {
      const ownSheikh = await this.sheikhRepo.findByUserId(user.tenantId, user.sub);
      if (!ownSheikh || ownSheikh.id !== sheikh.id) {
        throw new ForbiddenException('Sheikhs may only access their own class insights.');
      }
    }

    // ── Resolve assigned students ─────────────────────────────────────────────
    const students = await this.studentRepo.findBySheikh(user.tenantId, sheikhId, sheikh.groupIds);

    if (students.length === 0) {
      return {
        sheikhId, tenantId: user.tenantId, generatedAt: new Date(),
        totalStudents: 0, students: [], topPerformers: [], needsAttention: [],
        classAggregate: {
          averageMemorizationScore: 0, averageRevisionScore: 0,
          averageAttendanceScore: 0, averageDifficultyIndex: 0,
          classRetentionRate: 0, studentsWithHighForgettingRisk: 0,
          studentsWithLowAttendance: 0, totalOpenMistakes: 0,
        },
      };
    }

    // ── Build profiles concurrently ───────────────────────────────────────────
    const profileResults = await Promise.all(
      students.map(s => this.buildStudentBrief(user.tenantId, s.id)),
    );

    const profiles = profileResults.map(r => r.profile);
    const briefs = profileResults.map(r => r.brief);

    // ── Class aggregate ───────────────────────────────────────────────────────
    const classData = this.analyticsEngine.aggregateClass(profiles);

    return {
      sheikhId,
      tenantId: user.tenantId,
      generatedAt: new Date(),
      totalStudents: students.length,
      students: briefs,
      topPerformers: classData.topPerformers,
      needsAttention: classData.needsAttention,
      classAggregate: {
        averageMemorizationScore: classData.averageMemorizationScore,
        averageRevisionScore: classData.averageRevisionScore,
        averageAttendanceScore: classData.averageAttendanceScore,
        averageDifficultyIndex: classData.averageDifficultyIndex,
        classRetentionRate: classData.classRetentionRate,
        studentsWithHighForgettingRisk: classData.studentsWithHighForgettingRisk,
        studentsWithLowAttendance: classData.studentsWithLowAttendance,
        totalOpenMistakes: classData.totalOpenMistakes,
      },
    };
  }

  private async buildStudentBrief(
    tenantId: string,
    studentId: string,
  ): Promise<{ profile: StudentIntelligenceProfile; brief: StudentBrief }> {
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

    const profile = this.profileEngine.build({
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

    const recs = this.recEngine.generate(profile, misA, revA, memA);

    const brief: StudentBrief = {
      studentId,
      memorizationScore: profile.memorizationScore,
      revisionScore: profile.revisionScore,
      attendanceScore: profile.attendanceScore,
      consistencyScore: profile.consistencyScore,
      forgettingRisk: profile.forgettingRisk,
      difficultyIndex: profile.difficultyIndex,
      totalAyahsMemorized,
      overdueRevisionCount: profile.overdueRevisionCount,
      openMistakes: misA.openMistakes,
      topRecommendations: recs.slice(0, 2),
    };

    return { profile, brief };
  }
}

function estimateAyahsInRange(range: {
  surahFrom: number; ayahFrom: number; surahTo: number; ayahTo: number;
}): number {
  if (range.surahFrom === range.surahTo) return Math.max(0, range.ayahTo - range.ayahFrom + 1);
  return Math.max(1, (range.surahTo - range.surahFrom) * 10 + range.ayahTo - range.ayahFrom + 1);
}
