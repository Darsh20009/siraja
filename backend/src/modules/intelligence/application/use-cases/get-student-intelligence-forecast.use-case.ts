import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { assertCanAccessStudent } from '@shared/authorization/student-scope.util';
import { MemorizationStatus } from '@shared/enums/memorization.enum';

import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import { IStudentProgressRepository, STUDENT_PROGRESS_REPOSITORY } from '@modules/progress/domain/repositories/student-progress.repository.interface';
import { IMemorizationRecordRepository, MEMORIZATION_RECORD_REPOSITORY } from '@modules/memorization/domain/repositories/memorization-record.repository.interface';
import { IAyahPerformanceRepository, AYAH_PERFORMANCE_REPOSITORY } from '@modules/ayah-performance/domain/repositories/ayah-performance.repository.interface';

import { MemorizationEngine, MemorizationSessionData } from '../../domain/engines/memorization.engine';
import { RevisionEngine, AyahSm2Data } from '../../domain/engines/revision.engine';
import { ForecastEngine } from '../../domain/engines/forecast.engine';
import { IntelligenceForecast } from '../../domain/engines/forecast.engine';

/**
 * GetStudentIntelligenceForecastUseCase — Phase 13A.
 *
 * Computes an enhanced completion forecast with revision-burden adjustments
 * and risk classifications. Pure deterministic — no external services.
 */
@Injectable()
export class GetStudentIntelligenceForecastUseCase {
  private readonly memorizationEngine = new MemorizationEngine();
  private readonly revisionEngine = new RevisionEngine();
  private readonly forecastEngine = new ForecastEngine();

  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
    @Inject(STUDENT_PROGRESS_REPOSITORY) private readonly progressRepo: IStudentProgressRepository,
    @Inject(MEMORIZATION_RECORD_REPOSITORY) private readonly memRepo: IMemorizationRecordRepository,
    @Inject(AYAH_PERFORMANCE_REPOSITORY) private readonly ayahPerfRepo: IAyahPerformanceRepository,
  ) {}

  async execute(
    user: AccessTokenPayload,
    studentId: string,
  ): Promise<IntelligenceForecast & { studentId: string; generatedAt: Date }> {
    const roles = user.roles as Role[];
    let resolvedStudentId = studentId;

    const student = roles.includes(Role.STUDENT)
      ? await this.studentRepo.findByUserId(user.tenantId, user.sub)
      : await this.studentRepo.findById(user.tenantId, studentId);

    if (!student) throw new NotFoundException('Student not found.');

    if (roles.includes(Role.STUDENT)) {
      if (studentId !== user.sub && studentId !== student.id) {
        throw new ForbiddenException('Students may only access their own forecast.');
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

    return this.compute(user.tenantId, resolvedStudentId);
  }

  private async compute(
    tenantId: string,
    studentId: string,
  ): Promise<IntelligenceForecast & { studentId: string; generatedAt: Date }> {
    const [progress, memRecords, ayahPerf] = await Promise.all([
      this.progressRepo.findByStudent(tenantId, studentId),
      this.memRepo.findAll(tenantId, { studentId, status: MemorizationStatus.COMPLETED }, 1, 500),
      this.ayahPerfRepo.findByStudent(tenantId, studentId),
    ]);

    const totalAyahsMemorized = progress?.totalAyahsMemorized ?? 0;

    const memSessions: MemorizationSessionData[] = memRecords.items.map(r => ({
      score: r.score, grade: r.grade,
      ayahsCount: estimateAyahsInRange(r.range), evaluatedAt: r.evaluatedAt,
    }));

    const sm2Data: AyahSm2Data[] = ayahPerf.map(a => ({
      smNextReviewDue: a.smNextReviewDue, masteryScore: a.masteryScore,
    }));

    const memAnalysis = this.memorizationEngine.analyse(memSessions);
    const revAnalysis = this.revisionEngine.analyse([], sm2Data, totalAyahsMemorized);

    const forecast = this.forecastEngine.compute({
      totalAyahsMemorized,
      dailyPaceAyahs: memAnalysis.dailyPaceAyahs,
      activeDaysLast30: memAnalysis.activeDaysLast30,
      overdueRevisionCount: revAnalysis.overdueCount,
      revisionBurdenScore: revAnalysis.revisionBurdenScore,
      consistencyScore: Math.round((memAnalysis.activeDaysLast30 / 30) * 100),
    });

    return { ...forecast, studentId, generatedAt: new Date() };
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
