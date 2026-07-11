import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { Role } from '@shared/enums/roles.enum';
import { AiFeatureType } from '@shared/enums/ai.enum';
import { HeatmapLevel } from '@shared/enums/smart-mushaf.enum';
import { assertCanAccessStudent } from '@shared/authorization/student-scope.util';
import { IStudentRepository, STUDENT_REPOSITORY } from '@modules/students/domain/repositories/student.repository.interface';
import { ISheikhRepository, SHEIKH_REPOSITORY } from '@modules/sheikhs/domain/repositories/sheikh.repository.interface';
import { IParentRepository, PARENT_REPOSITORY } from '@modules/parents/domain/repositories/parent.repository.interface';
import {
  IStudentProgressRepository,
  STUDENT_PROGRESS_REPOSITORY,
} from '@modules/progress/domain/repositories/student-progress.repository.interface';
import {
  AYAH_PERFORMANCE_REPOSITORY,
  IAyahPerformanceRepository,
} from '@modules/ayah-performance/domain/repositories/ayah-performance.repository.interface';
import { AiInsightOrchestratorService } from '../services/ai-insight-orchestrator.service';
import { AI_SYSTEM_PREAMBLE } from '../prompts/ai-prompt.constants';

/** GenerateMemorizationRecommendationUseCase — "Memorization Recommendations" (deliverable #5). */
@Injectable()
export class GenerateMemorizationRecommendationUseCase {
  constructor(
    @Inject(STUDENT_PROGRESS_REPOSITORY) private readonly progressRepo: IStudentProgressRepository,
    @Inject(AYAH_PERFORMANCE_REPOSITORY) private readonly performanceRepo: IAyahPerformanceRepository,
    @Inject(STUDENT_REPOSITORY) private readonly studentRepo: IStudentRepository,
    @Inject(SHEIKH_REPOSITORY) private readonly sheikhRepo: ISheikhRepository,
    @Inject(PARENT_REPOSITORY) private readonly parentRepo: IParentRepository,
    private readonly orchestrator: AiInsightOrchestratorService,
  ) {}

  async execute(user: AccessTokenPayload, studentId: string, force = false) {
    const student = await this.studentRepo.findById(user.tenantId, studentId);
    if (!student) throw new NotFoundException('Student not found.');

    const roles = user.roles as Role[];
    assertCanAccessStudent(user, student, {
      sheikh: roles.includes(Role.SHEIKH) ? await this.sheikhRepo.findByUserId(user.tenantId, user.sub) : undefined,
      parent: roles.includes(Role.PARENT) ? await this.parentRepo.findByUserId(user.tenantId, user.sub) : undefined,
      ownStudentProfileId: roles.includes(Role.STUDENT)
        ? (await this.studentRepo.findByUserId(user.tenantId, user.sub))?.id ?? null
        : undefined,
    });
    if (force && !roles.some((r) => [Role.SHEIKH, Role.SUPERVISOR, Role.TENANT_ADMIN].includes(r))) {
      throw new ForbiddenException('Only sheikhs, supervisors, or admins may force-regenerate AI insights.');
    }

    const [progress, weakAyahs, needsReviewAyahs] = await Promise.all([
      this.progressRepo.findByStudent(user.tenantId, studentId),
      this.performanceRepo.findByStudent(user.tenantId, studentId, { heatmapLevel: HeatmapLevel.WEAK }),
      this.performanceRepo.findByStudent(user.tenantId, studentId, { heatmapLevel: HeatmapLevel.NEEDS_REVIEW }),
    ]);

    const sourceData = {
      currentJuzNumber: student.currentJuzNumber ?? null,
      currentMemorizationStatus: student.currentMemorizationStatus ?? null,
      progress,
      weakAyahs: weakAyahs.slice(0, 15).map((a) => ({ surahNumber: a.surahNumber, ayahNumber: a.ayahNumber })),
      needsReviewAyahs: needsReviewAyahs.slice(0, 15).map((a) => ({ surahNumber: a.surahNumber, ayahNumber: a.ayahNumber })),
    };

    return this.orchestrator.getOrGenerate({
      tenantId: user.tenantId,
      userId: user.sub,
      studentId,
      type: AiFeatureType.MEMORIZATION_RECOMMENDATION,
      sourceData,
      structured: sourceData,
      force,
      buildPrompt: () => ({
        system: AI_SYSTEM_PREAMBLE,
        user: `بالاعتماد فقط على تقدّم الحفظ والآيات الضعيفة/المحتاجة لمراجعة التالية لطالب واحد، اقترح خطة حفظ للأسبوع القادم توازن بين حفظ مادة جديدة وتعزيز الآيات الضعيفة:\n\n${JSON.stringify(sourceData)}`,
      }),
    });
  }
}
