import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { assertCanAccessStudent } from '@shared/authorization/student-scope.util';
import { AttendanceStatus } from '@shared/enums/attendance-status.enum';

import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
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
import { StudentIntelligenceProfile } from '../../domain/entities/student-intelligence-profile.entity';
import { MemorizationStatus, MistakeResolutionStatus } from '@shared/enums/memorization.enum';

/**
 * GetStudentIntelligenceProfileUseCase — Phase 13A.
 *
 * Orchestrates data fetch from five repositories, feeds results into the
 * pure domain engines, and returns a fully computed StudentIntelligenceProfile.
 *
 * RBAC:
 *   STUDENT        → own profile only
 *   PARENT         → linked children only
 *   SHEIKH         → assigned students only
 *   SUPERVISOR / TENANT_ADMIN → unrestricted within tenant
 */
@Injectable()
export class GetStudentIntelligenceProfileUseCase {
  private readonly memorizationEngine = new MemorizationEngine();
  private readonly revisionEngine = new RevisionEngine();
  private readonly mistakeEngine = new MistakeEngine();
  private readonly difficultyEngine = new DifficultyEngine();
  private readonly profileEngine = new StudentProfileEngine();

  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
    @Inject(STUDENT_PROGRESS_REPOSITORY) private readonly progressRepo: IStudentProgressRepository,
    @Inject(MEMORIZATION_RECORD_REPOSITORY) private readonly memRepo: IMemorizationRecordRepository,
    @Inject(REVIEW_RECORD_REPOSITORY) private readonly reviewRepo: IReviewRecordRepository,
    @Inject(QURAN_MISTAKE_REPOSITORY) private readonly mistakeRepo: IQuranMistakeRepository,
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendanceRepo: IAttendanceRepository,
    @Inject(AYAH_PERFORMANCE_REPOSITORY) private readonly ayahPerfRepo: IAyahPerformanceRepository,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string): Promise<StudentIntelligenceProfile> {
    // ── Resolve student + access check ────────────────────────────────────────
    const roles = user.roles as Role[];
    let resolvedStudentId = studentId;

    const student = roles.includes(Role.STUDENT)
      ? await this.studentRepo.findByUserId(user.tenantId, user.sub)
      : await this.studentRepo.findById(user.tenantId, studentId);

    if (!student) throw new NotFoundException('Student not found.');

    if (roles.includes(Role.STUDENT)) {
      if (studentId !== user.sub && studentId !== student.id) {
        throw new ForbiddenException('Students may only access their own profile.');
      }
      resolvedStudentId = student.id;
    } else {
      assertCanAccessStudent(user, student, {
        sheikh: roles.includes(Role.SHEIKH)
          ? await this.sheikhRepo.findByUserId(user.tenantId, user.sub)
          : undefined,
        parent: roles.includes(Role.PARENT)
          ? await this.parentRepo.findByUserId(user.tenantId, user.sub)
          : undefined,
      });
      resolvedStudentId = student.id;
    }

    return this.computeProfile(user.tenantId, resolvedStudentId);
  }

  async computeProfile(tenantId: string, studentId: string): Promise<StudentIntelligenceProfile> {
    // ── Parallel data fetch ───────────────────────────────────────────────────
    const [progress, memRecords, reviewRecords, mistakes, attendance, ayahPerf] = await Promise.all([
      this.progressRepo.findByStudent(tenantId, studentId),
      this.memRepo.findAll(tenantId, { studentId, status: MemorizationStatus.COMPLETED }, 1, 500),
      this.reviewRepo.findAll(tenantId, { studentId }, 1, 500),
      this.mistakeRepo.findAll(tenantId, { studentId }, 1, 500),
      this.attendanceRepo.getStudentAttendanceRate(tenantId, studentId),
      this.ayahPerfRepo.findByStudent(tenantId, studentId),
    ]);

    const totalAyahsMemorized = progress?.totalAyahsMemorized ?? 0;
    const memorizationPercentage = progress?.memorizationPercentage ?? 0;

    // ── Prepare engine inputs ─────────────────────────────────────────────────
    const memSessions: MemorizationSessionData[] = memRecords.items.map(r => ({
      score: r.score,
      grade: r.grade,
      ayahsCount: estimateAyahsInRange(r.range),
      evaluatedAt: r.evaluatedAt,
    }));

    const reviewSessions: RevisionSessionData[] = reviewRecords.items.map(r => ({
      retentionGrade: r.retentionGrade,
      ayahsCount: estimateAyahsInRange(r.range),
      reviewedAt: r.reviewedAt,
      nextReviewDueAt: r.nextReviewDueAt,
    }));

    const sm2Data: AyahSm2Data[] = ayahPerf.map(a => ({
      smNextReviewDue: a.smNextReviewDue,
      masteryScore: a.masteryScore,
    }));

    const mistakeItems: MistakeData[] = mistakes.items.map(m => ({
      id: m.id,
      surahNumber: m.surahNumber,
      ayahNumber: m.ayahNumber,
      type: m.type,
      severity: m.severity,
      resolutionStatus: m.resolutionStatus as MistakeResolutionStatus,
      createdAt: m.createdAt,
    }));

    // ── Run engines ───────────────────────────────────────────────────────────
    const memAnalysis = this.memorizationEngine.analyse(memSessions);
    const revAnalysis = this.revisionEngine.analyse(reviewSessions, sm2Data, totalAyahsMemorized);
    const misAnalysis = this.mistakeEngine.analyse(mistakeItems, totalAyahsMemorized);

    // SM-2 average easiness factor
    const avgEF = ayahPerf.length > 0
      ? ayahPerf.reduce((s, a) => s + (a.smEasinessFactor ?? 2.5), 0) / ayahPerf.length
      : 2.5;

    const diffAnalysis = this.difficultyEngine.analyse({
      gradeDistribution: memAnalysis.gradeDistribution,
      totalSessions: memAnalysis.totalSessions,
      totalMistakes: misAnalysis.totalMistakes,
      averageSmEasinessFactor: avgEF,
      mistakeRatePerAyah: misAnalysis.mistakeRatePerAyah,
      averageScore: memAnalysis.averageScore,
    });

    // Ayah performance summary for retention rate
    const retainedAyahs = ayahPerf.filter(a => a.masteryScore >= 60).length;
    const ayahPerfSummary = {
      totalAyahs: ayahPerf.length,
      retainedAyahs,
      averageSmEasinessFactor: avgEF,
    };

    return this.profileEngine.build({
      studentId,
      tenantId,
      totalAyahsMemorized,
      memorizationPercentage,
      memorizationAnalysis: memAnalysis,
      revisionAnalysis: revAnalysis,
      mistakeAnalysis: misAnalysis,
      difficultyAnalysis: diffAnalysis,
      attendance: { attendanceRate: attendance.attendanceRate },
      ayahPerformance: ayahPerfSummary,
    });
  }
}

function estimateAyahsInRange(range: {
  surahFrom: number; ayahFrom: number; surahTo: number; ayahTo: number;
}): number {
  if (range.surahFrom === range.surahTo) {
    return Math.max(0, range.ayahTo - range.ayahFrom + 1);
  }
  return Math.max(1, (range.surahTo - range.surahFrom) * 10 + range.ayahTo - range.ayahFrom + 1);
}
